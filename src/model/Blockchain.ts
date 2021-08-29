import { Hashing, HashedObject, MutableObject, MutationOp, LiteralContext, StateFilter, Store, Hash, PeerNode } from '@hyper-hyper-space/core';

import { Identity } from '@hyper-hyper-space/core';

import { SpaceEntryPoint } from '@hyper-hyper-space/core';

import { BlockOp } from './BlockOp';

import { Worker } from 'worker_threads';
import { HeaderBasedState } from '@hyper-hyper-space/core';
import { OpHeader } from '@hyper-hyper-space/core/dist/data/history/OpHeader';
import { MiniComptroller, FixedPoint } from './MiniComptroller';
import { Logger, LogLevel } from '../../../core/dist/util/logging';
//import { Logger, LogLevel } from 'util/logging';

class Blockchain extends MutableObject implements SpaceEntryPoint {

    //static log = new Logger(Blockchain.name, LogLevel.DEBUG)
    static gossipLog = new Logger(Blockchain.name, LogLevel.INFO);
    static miningLog = new Logger(Blockchain.name, LogLevel.INFO);
    

    static className = 'hhs/v0/soliton/Blockchain';

    totalCoins?: string;

    _coinbase?: Identity;

    _headBlock?: BlockOp;

    _values: string[];

    _computation?: Worker;
    _computationTermination?: Promise<Number>;
    _computationDifficulty?: bigint;
    _computationPrevBlock?: BlockOp;

    _autoCompute: boolean;

    _node?: PeerNode;

    _maxSeenBlockNumber?: bigint;

    constructor(seed?: string, totalCoins?: string) {
        super([BlockOp.className]);

        if (seed !== undefined) {
            this.setId(seed);
            if (totalCoins !== undefined)
                this.totalCoins = totalCoins;
            else
                this.totalCoins = "100";
        }
        
        this._values = [];
        this._autoCompute = false;
    }

    startCompute(coinbase: Identity) {
        this._autoCompute = true;
        this._coinbase = coinbase;
        this.race();
    }

    stopCompute() {
        this._autoCompute = false;
        this.stopRace();
    }

    race() {
        if (this._computation === undefined) {

            const comp = BlockOp.initializeComptroller(this._headBlock);

            // Bootstrap Period Protection pre-VDF.
            const bootstrap = comp.isBootstrapPeriod();

            let prevOpContext: LiteralContext | undefined;

            if (this._headBlock !== undefined) {
                prevOpContext = this._headBlock.toLiteralContext();
            }
            
            this._computationPrevBlock = this._headBlock;

            BlockOp.computeVrfSeed(this._coinbase as Identity, this._headBlock?.hash())
                             .then((vrfSeed: (string|undefined)) => {

                if (this._computation !== undefined) {
                    return;
                }

                const challenge = BlockOp.getChallenge(this, vrfSeed);
                const steps = BlockOp.getVDFSteps(comp, challenge);
                // TODO: after computing VDF Steps, final challenge must be hashed with the Merkle Root of TXs. 
                this._computationDifficulty = steps;
                Blockchain.miningLog.info('Mining #' + (comp.getBlockNumber() + BigInt(1)) + ', got ' + steps + ' steps for challenge ending in ' + challenge.slice(-6) + '...');
                Blockchain.miningLog.debug('Dynamic Max VDF Speed (vdfSteps/sec) = ', FixedPoint.toNumber(comp.getMovingMaxSpeed()) )
                Blockchain.miningLog.debug('Dynamic Min VDF Speed (vdfSteps/sec) = ', FixedPoint.toNumber(comp.getMovingMinSpeed()) )
                Blockchain.miningLog.debug('Dynamic VDF Speed Ratio (Exponential Difficulty Adj.) = ', FixedPoint.toNumber(comp.getSpeedRatio()) )
                Blockchain.miningLog.debug('Dynamic Block Time Factor (Linear Difficulty Adj.) = ', FixedPoint.toNumber(comp.getBlockTimeFactor()) )
                


                this._computation = new Worker('./dist/model/worker.js');
                this._computation.on('error', (err: Error) => { Blockchain.miningLog.error('Unexpected error while mining: ', err)});
                this._computation.on('message', async (msg: {challenge: string, result: string, bootstrapResult?: string}) => {
                    
                    Blockchain.miningLog.debug('Solved challenge ending in ' + msg.challenge.slice(-6) + '!');
                    if (msg.challenge === challenge ) {

                        let op = new BlockOp(this, this._computationPrevBlock, steps, msg.result, msg.bootstrapResult, this._coinbase, vrfSeed);
                        const prevOp = this._computationPrevBlock;

                        let blocktime = prevOp !== undefined? 
                            op.timestampMillisecs?.getValue() as bigint - (prevOp.timestampMillisecs?.getValue() as bigint)
                        :
                            MiniComptroller.targetBlockTime; // FIXME:pwd initial block time
        
                        if (blocktime == BigInt(0)) {
                            blocktime = BigInt(1) * FixedPoint.UNIT
                        }

                        Blockchain.miningLog.info('⛏️⛏️⛏️⛏️ #' + op.blockNumber?.getValue() + ' mined by us with coinbase ' + this._coinbase?.getLastHash() + ', block time ' + (Number(blocktime)/(10**(FixedPoint.DECIMALS+3))).toFixed(4).toString() + 's, block hash ends in ' + op.hash().slice(-6));
                        Blockchain.miningLog.info('Tokenomics: movingMaxSpeed=' + (Number(op.movingMaxSpeed?.getValue()) / 10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
                            + ', movingMinSpeed=' + (Number(op.movingMinSpeed?.getValue())/10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
                            + ', blockTimeFactor=' + (Number(op.blockTimeFactor?.getValue())/10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
                            + ', speedRatio=' + (Number(FixedPoint.divTrunc(op.movingMaxSpeed?.getValue() as bigint, op.movingMinSpeed?.getValue() as bigint)) / 10**FixedPoint.DECIMALS)?.toFixed(4)?.toString()
                            + ', currentSpeed=' + (Number(steps) / (Number(blocktime)/10**FixedPoint.DECIMALS/1000))?.toFixed(4)?.toString()
                            );
                            
                        /*if (this._lastBlock !== undefined) {
                            op.setPrevOps(new Set([this._lastBlock]).values());
                        } else {
                            op.setPrevOps(new Set<MutationOp>().values());
                        }*/
    
                        await this.applyNewOp(op);
                        await this.getStore().save(this);
                        
                    } else {
                        Blockchain.miningLog.warning('Mismatched challenge - could be normal. Solved one ending in ' + msg.challenge.slice(-6) + ' but expected ' + challenge.slice(-6));
                    }
                });
                this._computation.postMessage({steps: steps, challenge: challenge, prevOpContext: prevOpContext, bootstrap: bootstrap});
                
            });
            
        } else {
            Blockchain.miningLog.warning('Race was called but a computation is running.');
        }
    }

    stopRace() {
        if (this._computation !== undefined) {
            if (this._computationTermination === undefined) {
                Blockchain.miningLog.debug('Going to stop mining current block.');
                this._computationTermination = this._computation.terminate().then(
                    (ret: number) => {
                        Blockchain.miningLog.debug('Mining of current block stopped!');
                        this._computation = undefined;
                        this._computationTermination = undefined;
                        this._computationDifficulty  = undefined;
                        this._computationPrevBlock = undefined;
                        return ret;
                    }
                );
    
            }
        }
    }

    getInitialChallenge(): string {
        return Hashing.sha.sha256hex(this.getId() as string);
    }

    /*
    private currentChallenge(): string {
        let ret = ''
        if (this._lastBlock === undefined) {
            ret = this.getInitialChallenge();
        } else {
            ret = Hashing.sha.sha256hex(this._lastBlock.hash());
        }
        return ret //.slice(0, ret.length/2)
    }
    */
    /*
    private currentSeq() {
        if (this._lastBlock === undefined) {
            return 0;
        } else {
            return (this._lastBlock.seq as number) + 1;
        }
    }
    */

    async mutate(op: MutationOp): Promise<boolean> {

        let accept = false;

        if (op instanceof BlockOp) {

            if (this._headBlock === undefined) {
                accept = true;
            } else if (this._coinbase?.equals(op.getAuthor()) && op.getPrevBlockHash() === this._headBlock?.hash()) { 
            
                accept = true;

            } else {
                /*
                const lastOpHash        = this._lastBlock.hash()
                const lastOpBlocknumber = this._lastBlock.blockNumber?._value as bigint;
                const lastOpSteps       = this._lastBlock.vdfSteps?._value as bigint;

                const newOpHash        = op.hash()
                const newOpBlocknumber = op.blockNumber?._value as bigint;                
                const newOpSteps       = op.vdfSteps?._value as bigint;
                
                accept = (newOpBlocknumber > lastOpBlocknumber) ||
                         (newOpBlocknumber === lastOpBlocknumber && newOpSteps < lastOpSteps) ||
                         (newOpBlocknumber === lastOpBlocknumber && newOpSteps === lastOpSteps &&
                          newOpHash.localeCompare(lastOpHash) < 0);
                          */
                    
                if (this._computation !== undefined && this._computationDifficulty !== undefined) {
                    accept = await BlockOp.shouldInterruptCurrentMining(this._computationPrevBlock, this, this._computationDifficulty as bigint, this._coinbase as Identity, op, this.getResources()?.store as Store);
                    if (!accept) {

                        let prevBlockNumber = this._computationPrevBlock?.blockNumber?.getValue() as bigint;

                        if (prevBlockNumber === undefined) {
                            prevBlockNumber = BigInt(0)
                        }

                        Blockchain.miningLog.info('Going to ignore received block #' + op.blockNumber?.getValue()?.toString() + ' (hash ending in ' + op.getLastHash().slice(-6) + '), its difficulty is ' + op.vdfSteps?.getValue()?.toString() + ' and we are currently mining with a difficulty of ' + this._computationDifficulty?.toString() + ' for #' + (prevBlockNumber  + BigInt(1)).toString());
                        //Blockchain.miningLog.info('Going to ignore received block #')
                    }
                } else {
                    accept = await BlockOp.shouldAcceptNewHead(op, this._headBlock, this.getResources()?.store as Store);
                }
                
            }

            if (accept) {

                this._headBlock = op;

                this._values.push(Hashing.toHex(op.hash()));

                if (this._autoCompute) {
                    if (this._computation === undefined) {
                        this.race();
                    } else {
                        this.stopRace();
                        this._computationTermination?.then(() => { this.race(); });
                    }
                }

                //console.log('Challenge now is "' + this.currentChallenge() + '" for Blockchain position ' + this.currentSeq() + '.');
            }

        }

        return accept;
    }

    getClassName(): string {
        return Blockchain.className;
    }

    init(): void {
        
    }

    async validate(references: Map<string, HashedObject>): Promise<boolean> {
       references;

       return this.totalCoins !== undefined && this.getId() !== undefined;
    }

    async startSync(): Promise<void> {

        let resources = this.getResources();

        if (resources === undefined) {
            throw new Error('Cannot start sync: resources not configured.');
        }

        this._node = new PeerNode(resources);
        
        this._node.broadcast(this);
        this._node.sync(this);

        await this.loadAndWatchForChanges();
    }
    
    async stopSync(): Promise<void> {
        this._node?.stopBroadcast(this);
        this._node?.stopSync(this);
    }

    getSyncAgentStateFilter(): StateFilter {
        const forkChoiceFilter: StateFilter = async (state: HeaderBasedState, store: Store) => {


            const MAX_FINALITY_DEPTH=MiniComptroller.getMaxSpeedRatioNumber();

            const mut = state.mutableObj as Hash;

            const local = await store.loadTerminalOpsForMutable(mut);

            let maxHeight = 0;

            Blockchain.gossipLog.debug('Filtering gossip for blockchain ' + this.hash() + ' (' + state.terminalOpHeaders?.size() + ' forks in state)');

            if (local?.terminalOps !== undefined) {
                for (const opHash of local?.terminalOps) {
                    const opHistory = await store.loadOpHeader(opHash) as OpHeader;
                    if (opHistory.computedProps.height > maxHeight) {
                        maxHeight = opHistory.computedProps.height;
                    }
                }
            }

            const filteredOpHeaders: OpHeader[] = [];

            if (state.terminalOpHeaders !== undefined) {
                for (const opHeaderLiteral of state.terminalOpHeaders.values()) {
                    if (opHeaderLiteral.computedHeight > maxHeight) {
                        maxHeight = opHeaderLiteral.computedHeight;
                    }
                }

                for (const opHeaderLiteral of state.terminalOpHeaders.values()) {
                    if (opHeaderLiteral.computedHeight+MAX_FINALITY_DEPTH >= maxHeight) {
                        filteredOpHeaders.push(new OpHeader(opHeaderLiteral));
                    } else {
                        Blockchain.gossipLog.trace('Discarding terminal op history ' + opHeaderLiteral.headerHash + ' (height: ' + opHeaderLiteral.computedHeight + ', current height: ' + maxHeight + ')');
                    }
                }
            }

            Blockchain.gossipLog.debug('Done filtering gossip for blockcahin ' + this.hash() + ', height post-gossip is ' + maxHeight);

            const forkChoiceState = new HeaderBasedState(mut, filteredOpHeaders);

            return forkChoiceState;

        };

        return forkChoiceFilter;
    }

}

HashedObject.registerClass(Blockchain.className, Blockchain);

export { Blockchain };