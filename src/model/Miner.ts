import { Hash, Identity } from '@hyper-hyper-space/core';

import { Logger, LogLevel } from '@hyper-hyper-space/core/dist/util/logging';


import { Blockchain } from './Blockchain';
import { BlockOp } from './BlockOp';

import { MiniComptroller, FixedPoint } from './MiniComptroller';

import { Worker } from 'worker_threads';

class Miner {

    static miningLog = new Logger(Miner.name, LogLevel.INFO);
    
    blockchain: Blockchain;

    _coinbase?: Identity;

    _computation?: Worker;
    _computationDifficulty?: bigint;
    _computationPrevBlock?: BlockOp;
    _computationChallenge?: string;

    _autoCompute: boolean;

    _fallBehindCheckInterval: any;
    _fallBehindCheckLastHeights: bigint[];
    _fallBehindStop: boolean;

    constructor(blockchain: Blockchain, coinbase: Identity) {
        this.blockchain = blockchain;
        this._coinbase = coinbase;

        this._autoCompute = false;
        this._fallBehindStop = false;
        this._fallBehindCheckLastHeights = [];

        this.vrfSeedCallback = this.vrfSeedCallback.bind(this);

        this.computationCallback = this.computationCallback.bind(this);
        this.computationError = this.computationError.bind(this);

        this.onNewBlock = this.onNewBlock.bind(this);

        blockchain.addNewBlockCallback(this.onNewBlock);
    }

    onNewBlock(blockOp: BlockOp, isNewHead: boolean) {
        this.onNewBlockAsync(blockOp, isNewHead);
    }

    async onNewBlockAsync(blockOp: BlockOp, isNewHead: boolean) {

        let interrupt = false;


        let prevBlockNumber = this._computationPrevBlock?.getBlockNumber();

        if (prevBlockNumber === undefined) {
            prevBlockNumber = BigInt(0)
        }
        
        if (isNewHead) {
            if (this._computation !== undefined && this._computationDifficulty !== undefined) {
                interrupt = await this.shouldInterruptCurrentMining(blockOp);
            } else {
                interrupt = true;
            }

            if (interrupt) {

                if (this._computation !== undefined) {
                    Miner.miningLog.info('Stopping current mining compute.');
                    await this.stopRace();
                }

            }
            
            if (this._autoCompute) {
                if (this._computation === undefined) {
                    Miner.miningLog.info('Started new mining compute.');
                    this.race();    
                } else {
                    Miner.miningLog.info('Continuing current mining compute.');
                }
            }    
        } else {
            if (this._computation === undefined) {
                Miner.miningLog.info('Going to ignore block #' + blockOp.getBlockNumber()?.toString() + ' (hash ending in ' + blockOp.getLastHash().slice(-6) + '), difficulty: ' + blockOp.getVdfSteps()?.toString() + ' keeping current head #' + this.blockchain._headBlock?.getBlockNumber().toString() + ' with a difficulty of ' + this.blockchain._headBlock?.getVdfSteps()?.toString() + ', (hash ends in ' + this.blockchain._headBlock?.getLastHash().slice(-6) + ')');
            } else {
                Miner.miningLog.info('Going to ignore block #' + blockOp.getBlockNumber()?.toString() + ' (hash ending in ' + blockOp.getLastHash().slice(-6) + '), difficulty: ' + blockOp.getVdfSteps()?.toString() + ' and we are currently mining with a difficulty of ' + this._computationDifficulty?.toString() + ', keeping current head for #' + (prevBlockNumber  + BigInt(1)).toString());
            }              
        }

    }

    enableMining() {
        this._autoCompute = true;

        const historySize = 20;

        if (this._fallBehindCheckInterval === undefined) {
            this._fallBehindCheckInterval = setInterval(() => {

                const stopped = this._fallBehindStop;

                const newHeight = this.blockchain._headBlock?.getBlockNumber();

                if (newHeight !== undefined) {
                    this._fallBehindCheckLastHeights.push(newHeight);
                    if (this._fallBehindCheckLastHeights.length > historySize) {
                        this._fallBehindCheckLastHeights.shift();
                    }

                    if (this._fallBehindCheckLastHeights.length === historySize) {
                        const oldHeight = this._fallBehindCheckLastHeights[0];
                        this._fallBehindStop = newHeight > oldHeight + BigInt(8);
                    }

                    
                }
                
                if (this._fallBehindStop) {
                    if (this._computation !== undefined) { this.stopRace(); }
                } else if (stopped) {
                    if (this._computation === undefined) { this.race(); }
                }

            }, 5000);
        }

        this._fallBehindStop = false;

        this.race();
    }

    disableMining() {
        this._autoCompute = false;
        this.stopRace();
        if (this._fallBehindCheckInterval !== undefined) {

            clearInterval(this._fallBehindCheckInterval);
            this._fallBehindStop = false;

        }
    }

    race() {

        if (this._fallBehindStop) {
            Miner.miningLog.info('Cancelling mining of a new block - too far behind.');
            return;
        }

        
        if (this._computation === undefined) {
            
            this._computationPrevBlock = this.blockchain._headBlock;

            BlockOp.computeVrfSeed(this._coinbase as Identity, this._computationPrevBlock?.hash())
                             .then(this.vrfSeedCallback);
            
        } else {
            Miner.miningLog.warning('Race was called but a computation is running.');
        }
    }

    vrfSeedCallback(result: {coinbase: Identity, prevBlockHash?: Hash, vrfSeed?: string}): void {

        if (this._computation !== undefined) {
            return;
        }

        if (result.prevBlockHash !== this._computationPrevBlock?.getLastHash()) {
            return; // this is a 'ghost compute', another one was started and we're being cancelled.
        }

        const comp = BlockOp.initializeComptroller(this._computationPrevBlock);

        // Bootstrap Period Protection pre-VDF.
        const bootstrap = comp.isBootstrapPeriod();

        const challenge = BlockOp.getChallenge(this.blockchain, result.vrfSeed);
        this._computationChallenge = challenge;
        const steps = BlockOp.getVDFSteps(comp, challenge);

        // TODO: after computing VDF Steps, final challenge must be hashed with the Merkle Root of TXs.

        this._computationDifficulty = steps;
        
        Miner.miningLog.info('Mining #' + (comp.getBlockNumber() + BigInt(1)) + ', got ' + steps + ' steps for challenge ending in ' + challenge.slice(-6) + '...');
        Miner.miningLog.debug('Dynamic Max VDF Speed (vdfSteps/sec) = ' + FixedPoint.toNumber(comp.getMovingMaxSpeed()) )
        Miner.miningLog.debug('Dynamic Min VDF Speed (vdfSteps/sec) = ' + FixedPoint.toNumber(comp.getMovingMinSpeed()) )
        Miner.miningLog.debug('Dynamic VDF Speed Ratio (Exponential Difficulty Adj.) = ' + FixedPoint.toNumber(comp.getSpeedRatio()) )
        Miner.miningLog.debug('Dynamic Block Time Factor (Linear Difficulty Adj.) = ' + FixedPoint.toNumber(comp.getBlockTimeFactor()) )

        const prevOpContext = this._computationPrevBlock?.toLiteralContext();

        this._computation = new Worker('./dist/model/worker.js');
        this._computation.on('error', this.computationError);
        this._computation.on('message', this.computationCallback);

        this._computation.postMessage({steps: steps, challenge: challenge, prevOpContext: prevOpContext, prevBlockHash: this._computationPrevBlock?.getLastHash(), bootstrap: bootstrap, vrfSeed: result.vrfSeed});
        
    }

    computationError(err: Error) { 
        Miner.miningLog.error('Unexpected error while mining: ', err);
    }

    computationCallback(msg: {challenge: string, result: string, steps: bigint, prevBlockHash?: Hash, bootstrapResult?: string, vrfSeed?: string}) {
        this.computationCallbackAsync(msg).then();
    }

    async computationCallbackAsync(msg: {challenge: string, result: string, steps: bigint, prevBlockHash?: Hash, bootstrapResult?: string, vrfSeed?: string}) {
                    
        Miner.miningLog.debug('Solved challenge ending in ' + msg.challenge.slice(-6) + '!');
        if (msg.challenge === this._computationChallenge ) {

            if (!(msg.prevBlockHash === this._computationPrevBlock?.getLastHash())) {
                return; // this is a 'ghost compute', another one was started and we're being cancelled.
            }

            let op = new BlockOp(this.blockchain, this._computationPrevBlock, msg.steps, msg.result, msg.bootstrapResult, this._coinbase, msg.vrfSeed);
            

            let blocktime = this._computationPrevBlock !== undefined? 
                op.getTimestampMillisecs() - (this._computationPrevBlock.getTimestampMillisecs())
            :
                MiniComptroller.targetBlockTime * BigInt(1000); // FIXME:pwd initial block time

            if (blocktime == BigInt(0)) {
                blocktime = BigInt(1) * FixedPoint.UNIT
            }

            Miner.miningLog.info('⛏️⛏️⛏️⛏️ #' + op.getBlockNumber() + ' mined by us with coinbase ' + this._coinbase?.getLastHash() + ', block time ' + (Number(blocktime)/(10**(FixedPoint.DECIMALS+3))).toFixed(4).toString() + 's, block hash ends in ' + op.hash().slice(-6));
            Miner.miningLog.info('Tokenomics: movingMaxSpeed=' + (Number(op.getMovingMaxSpeed()) / 10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
                + ', movingMinSpeed=' + (Number(op.getMovingMinSpeed())/10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
                + ', blockTimeFactor=' + (Number(op.getBlockTimeFactor())/10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
                + ', speedRatio=' + (Number(FixedPoint.divTrunc(op.getMovingMaxSpeed(), op.getMovingMinSpeed())) / 10**FixedPoint.DECIMALS)?.toFixed(4)?.toString()
                + ', speed=' + (Number(msg.steps) / (Number(blocktime)/10**FixedPoint.DECIMALS/1000))?.toFixed(4)?.toString()
                );
                
            /*if (this._lastBlock !== undefined) {
                op.setPrevOps(new Set([this._lastBlock]).values());
            } else {
                op.setPrevOps(new Set<MutationOp>().values());
            }*/

            await this.stopRace();
            await this.blockchain.applyNewOp(op);
            await this.blockchain.getStore().save(this.blockchain);
            
        } else {
            Miner.miningLog.warning('Mismatched challenge - could be normal. Solved one ending in ' + msg.challenge.slice(-6) + ' but expected ' + msg.challenge.slice(-6));
        }
        
    }

    stopRace(): Promise<void> {
        if (this._computation !== undefined) {
            Miner.miningLog.debug('Going to stop mining current block.');
            const result = this._computation.terminate().then(
                () => {
                    Miner.miningLog.debug('Mining of current block stopped!');
                    return;
                }
            );
            this._computation           = undefined;
            this._computationPrevBlock  = undefined;
            this._computationDifficulty = undefined;
            return result;
        } else {
            return Promise.resolve();
        }
    }

    shouldInterruptCurrentMining(newHead: BlockOp) { 
        let miningBlock = new BlockOp(this.blockchain, this._computationPrevBlock, this._computationDifficulty as bigint, '', '', this._coinbase, '')

        return this.blockchain.shouldAcceptNewHead(newHead, miningBlock)

    }
}

export { Miner };