import { Hashing, HashedObject, MutableObject, MutationOp, LiteralContext, StateFilter, Store, Hash, PeerNode } from '@hyper-hyper-space/core';

import { Identity } from '@hyper-hyper-space/core';

import { SpaceEntryPoint } from '@hyper-hyper-space/core';

import { BlockOp } from './BlockOp';

import { Worker } from 'worker_threads';
import { HeaderBasedState } from '@hyper-hyper-space/core';
import { OpHeader } from '@hyper-hyper-space/core/dist/data/history/OpHeader';
import { MiniComptroller, FixedPoint } from './MiniComptroller';
import { Logger, LogLevel } from '../../../core/dist/util/logging';
import { Lock } from '@hyper-hyper-space/core/dist/util/concurrency';
import { HashedBigInt } from './HashedBigInt';
//import { Logger, LogLevel } from 'util/logging';

class Blockchain extends MutableObject implements SpaceEntryPoint {

    //static log = new Logger(Blockchain.name, LogLevel.DEBUG)
    static gossipLog = new Logger(Blockchain.name, LogLevel.INFO);
    static miningLog = new Logger(Blockchain.name, LogLevel.INFO);
    

    static className = 'hhs/v0/soliton/Blockchain';

    totalCoins?: string;

    _coinbase?: Identity;

    _headBlock?: BlockOp;

    _computation?: Worker;
    _computationDifficulty?: bigint;
    _computationPrevBlock?: BlockOp;

    _newBlockLock: Lock;

    _autoCompute: boolean;

    _fallBehindCheckInterval: any;
    _fallBehindCheckLastHeight?: bigint;
    _fallBehindStop: boolean;

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
        
        this._autoCompute = false;
        this._newBlockLock = new Lock();
        this._fallBehindStop = false;
    }

    enableMining(coinbase: Identity) {
        this._autoCompute = true;
        this._coinbase = coinbase;

        if (this._fallBehindCheckInterval === undefined) {
            this._fallBehindCheckInterval = setInterval(() => {

                const stopped = this._fallBehindStop;

                const newHeight = this._headBlock?.blockNumber?.getValue();
                const oldHeight = this._fallBehindCheckLastHeight;
                this._fallBehindStop = newHeight !== undefined && oldHeight !== undefined &&
                                       newHeight > oldHeight + BigInt(5);

                if (this._fallBehindStop) {
                    if (this._computation !== undefined) { this.stopRace(); }
                } else if (stopped) {
                    if (this._computation === undefined) { this.race(); }
                }

                this._fallBehindCheckLastHeight = newHeight;

            }, 20000);
        }

        this._fallBehindStop = true;

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
            Blockchain.miningLog.info('Cancelling mining of a new block - too far behind.');
            return;
        }

        
        if (this._computation === undefined) {

            const comp = BlockOp.initializeComptroller(this._headBlock);

            // Bootstrap Period Protection pre-VDF.
            const bootstrap = comp.isBootstrapPeriod();

            let prevOpContext: LiteralContext | undefined;

            if (this._headBlock !== undefined) {
                prevOpContext = this._headBlock.toLiteralContext();
            }
            
            this._computationPrevBlock = this._headBlock;

            const prevBlock = this._computationPrevBlock;

            BlockOp.computeVrfSeed(this._coinbase as Identity, this._headBlock?.hash())
                             .then((vrfSeed: (string|undefined)) => {

                if (this._computation !== undefined) {
                    return;
                }

                if (!((prevBlock !== undefined && prevBlock.equals(this._computationPrevBlock)) || (prevBlock === undefined && this._computationPrevBlock === undefined))) {
                    return; // this is a 'ghost compute', another one was started and we're being cancelled.
                }

                const challenge = BlockOp.getChallenge(this, vrfSeed);
                const steps = BlockOp.getVDFSteps(comp, challenge);

                // TODO: after computing VDF Steps, final challenge must be hashed with the Merkle Root of TXs.

                this._computationDifficulty = steps;
                
                Blockchain.miningLog.info('Mining #' + (comp.getBlockNumber() + BigInt(1)) + ', got ' + steps + ' steps for challenge ending in ' + challenge.slice(-6) + '...');
                Blockchain.miningLog.debug('Dynamic Max VDF Speed (vdfSteps/sec) = ' + FixedPoint.toNumber(comp.getMovingMaxSpeed()) )
                Blockchain.miningLog.debug('Dynamic Min VDF Speed (vdfSteps/sec) = ' + FixedPoint.toNumber(comp.getMovingMinSpeed()) )
                Blockchain.miningLog.debug('Dynamic VDF Speed Ratio (Exponential Difficulty Adj.) = ' + FixedPoint.toNumber(comp.getSpeedRatio()) )
                Blockchain.miningLog.debug('Dynamic Block Time Factor (Linear Difficulty Adj.) = ' + FixedPoint.toNumber(comp.getBlockTimeFactor()) )
                
                

                this._computation = new Worker('./dist/model/worker.js');
                this._computation.on('error', (err: Error) => { Blockchain.miningLog.error('Unexpected error while mining: ', err)});
                this._computation.on('message', async (msg: {challenge: string, result: string, bootstrapResult?: string}) => {
                    
                    Blockchain.miningLog.debug('Solved challenge ending in ' + msg.challenge.slice(-6) + '!');
                    if (msg.challenge === challenge ) {

                        if (!((prevBlock !== undefined && prevBlock.equals(this._computationPrevBlock)) || (prevBlock === undefined && this._computationPrevBlock === undefined))) {
                            return; // this is a 'ghost compute', another one was started and we're being cancelled.
                        }

                        let op = new BlockOp(this, this._computationPrevBlock, steps, msg.result, msg.bootstrapResult, this._coinbase, vrfSeed);
                        

                        let blocktime = this._computationPrevBlock !== undefined? 
                            op.timestampMillisecs?.getValue() as bigint - (this._computationPrevBlock.timestampMillisecs?.getValue() as bigint)
                        :
                            MiniComptroller.targetBlockTime * BigInt(1000); // FIXME:pwd initial block time
        
                        if (blocktime == BigInt(0)) {
                            blocktime = BigInt(1) * FixedPoint.UNIT
                        }

                        Blockchain.miningLog.info('⛏️⛏️⛏️⛏️ #' + op.blockNumber?.getValue() + ' mined by us with coinbase ' + this._coinbase?.getLastHash() + ', block time ' + (Number(blocktime)/(10**(FixedPoint.DECIMALS+3))).toFixed(4).toString() + 's, block hash ends in ' + op.hash().slice(-6));
                        Blockchain.miningLog.info('Tokenomics: movingMaxSpeed=' + (Number(op.movingMaxSpeed?.getValue()) / 10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
                            + ', movingMinSpeed=' + (Number(op.movingMinSpeed?.getValue())/10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
                            + ', blockTimeFactor=' + (Number(op.blockTimeFactor?.getValue())/10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
                            + ', speedRatio=' + (Number(FixedPoint.divTrunc(op.movingMaxSpeed?.getValue() as bigint, op.movingMinSpeed?.getValue() as bigint)) / 10**FixedPoint.DECIMALS)?.toFixed(4)?.toString()
                            + ', speed=' + (Number(steps) / (Number(blocktime)/10**FixedPoint.DECIMALS/1000))?.toFixed(4)?.toString()
                            );
                            
                        /*if (this._lastBlock !== undefined) {
                            op.setPrevOps(new Set([this._lastBlock]).values());
                        } else {
                            op.setPrevOps(new Set<MutationOp>().values());
                        }*/
    
                        await this.stopRace();
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

    stopRace(): Promise<void> {
        if (this._computation !== undefined) {
            Blockchain.miningLog.debug('Going to stop mining current block.');
            const result = this._computation.terminate().then(
                () => {
                    Blockchain.miningLog.debug('Mining of current block stopped!');
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
        let interrupt = false;

        if (op instanceof BlockOp) {

            if (this._headBlock === undefined) {
                accept = true;
            } else if (await this.shouldAcceptNewHead(op, this._headBlock)) { 
                accept = true;
            }

            let prevBlockNumber = this._computationPrevBlock?.blockNumber?.getValue() as bigint;

            if (prevBlockNumber === undefined) {
                prevBlockNumber = BigInt(0)
            }

            if (accept) {
                this._headBlock = op;

                if (this._computation !== undefined && this._computationDifficulty !== undefined) {
                    interrupt = await this.shouldInterruptCurrentMining(op);
                } else {
                    interrupt = true;
                }

                if (interrupt) {

                    if (this._computation !== undefined) {
                        Blockchain.miningLog.info('Stopping current mining compute.');
                        await this.stopRace();
                    }

                }
                
                if (this._autoCompute) {
                    if (this._computation === undefined) {
                        Blockchain.miningLog.info('Started new mining compute.');
                        this.race();    
                    } else {
                        Blockchain.miningLog.info('Continuing current mining compute.');
                    }
                }    

            } else {
                Blockchain.miningLog.info('Going to ignore received block #' + op.blockNumber?.getValue()?.toString() + ' (hash ending in ' + op.getLastHash().slice(-6) + '), difficulty: ' + op.vdfSteps?.getValue()?.toString() + ' and we are currently mining with a difficulty of ' + this._computationDifficulty?.toString() + ', keeping current head for #' + (prevBlockNumber  + BigInt(1)).toString());
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

    // Caveat: oldHead sometimes may be the block we are currently mining, and therefore
    //         it does not exist in the store (or its causal history).

    async shouldAcceptNewHead(newHead: BlockOp, oldHead: BlockOp): Promise<boolean> {

        const store = this.getStore();

        if (newHead.equals(oldHead)) {
            return false;
        }

        let longestChainFinalityDepth = 0;

        const newHeight = (newHead.blockNumber as HashedBigInt).getValue();
        const oldHeight = (oldHead.blockNumber as HashedBigInt).getValue();

        if (oldHeight === newHeight) {
            const oldFinality = oldHead.getFinalityDepth();
            const newFinality = newHead.getFinalityDepth();

            if (oldFinality > newFinality) {
                longestChainFinalityDepth = oldFinality;
            } else {
                longestChainFinalityDepth = newFinality;
            }
        } else if (oldHeight > newHeight) {
            longestChainFinalityDepth = oldHead.getFinalityDepth();
        } else {
            longestChainFinalityDepth = newHead.getFinalityDepth()
        }


        let heightDifference = newHeight - oldHeight;
        if (heightDifference < BigInt(0)) {
            heightDifference = -heightDifference;
        }
        
        
        if (heightDifference > longestChainFinalityDepth) {
            return newHeight > oldHeight; // we're out of the finality window, longest chain wins
        }

        // ok, we're inside the finality window: must find the forking point and see which sub-chain
        //                                       is better by looking at the two forking blocks.

        let currentNewBlock = newHead;
        let currentOldBlock = oldHead;
        
        for (let d = 0; d < longestChainFinalityDepth; d++) {

            if (currentNewBlock.equals(oldHead)) { // there's no fork!
                return true; // accept: the new block is a later block in the same chain as the current one
            }

            const currentNewBlockHeight = (currentNewBlock.blockNumber as HashedBigInt).getValue();
            const currentOldBlockHeight = (currentOldBlock.blockNumber as HashedBigInt).getValue();

            if (currentNewBlockHeight > currentOldBlockHeight) {             // => currentNewBlockHeight > 0
                const prevHashA = currentNewBlock.getPrevBlockHash();        // => prevHashA !== undefined
                if (prevHashA !== undefined) {
                    currentNewBlock = await store.load(prevHashA) as BlockOp;
                }
            } else if (currentNewBlockHeight < currentOldBlockHeight) {      // => currentOldBlockHeight > 0
                const prevHashB = currentOldBlock.getPrevBlockHash();        // => prevHashB !== undefined
                if (prevHashB !== undefined) {
                    currentOldBlock = await store.load(prevHashB) as BlockOp;
                }
            } else { // same len

                if (currentNewBlock.getPrevBlockHash() === currentOldBlock.getPrevBlockHash()) {
                    const newLocalDifficulty = currentNewBlock.vdfSteps?.getValue() as bigint; 
                    const oldLocalDifficulty = currentOldBlock.vdfSteps?.getValue() as bigint;

                    if (newLocalDifficulty === oldLocalDifficulty) {
                        return currentNewBlock.hash().localeCompare(currentOldBlock.hash()) < 0;
                    } else {
                        return newLocalDifficulty < oldLocalDifficulty;
                    }
                } else { 
                    const newBlockPrevHash = currentNewBlock.getPrevBlockHash();
                    if (newBlockPrevHash !== undefined) {
                        currentNewBlock = await store.load(newBlockPrevHash) as BlockOp;
                        if (currentNewBlock === undefined) { throw new Error('Op ' + newBlockPrevHash + ', prevOp of the new head op ' + newHead.hash() + ' with #' + (newHead.blockNumber as HashedBigInt).getValue() + ' d=' + d)} 
                    } else {
                        throw new Error('The forked chain and the old one have different origin blocks, this should be impossible');
                    }
                    const oldBlockPrevHash = currentOldBlock.getPrevBlockHash();
                    if (oldBlockPrevHash !== undefined) {
                        currentOldBlock = await store.load(oldBlockPrevHash) as BlockOp;
                        if (currentOldBlock === undefined) { throw new Error('Op ' + oldBlockPrevHash + ', prevOp of the old head op ' + oldHead.hash() + ' with #' + (oldHead.blockNumber as HashedBigInt).getValue() + ' d=' + d)} 
                    } else {
                        throw new Error('The forked chain and the old one have different origin blocks, this should be impossible');
                    }
                }
            }
        }


        if (newHeight === oldHeight) {

            const newTotalDifficulty = BigInt('0x' +(await this.getOpHeader(newHead.hash())).headerProps.get('totalDifficulty'));
            
            // See note above (Caveat...): oldHead may not exist in the store (if it is the block being currenty mined)
            
            let oldTotalDifficulty: bigint;

            try {
                const oldHeadHeader = await this.getOpHeader(oldHead.hash());
                oldTotalDifficulty = BigInt('0x' + oldHeadHeader.headerProps.get('totalDifficulty'));
            } catch (e) {
                const prevBlockHash  = oldHead.getPrevBlockHash();
                oldTotalDifficulty = (oldHead.vdfSteps as HashedBigInt).getValue() + 
                                     ((prevBlockHash === undefined) ? BigInt(0) :
                                                                      BigInt('0x' + (await this.getOpHeader(prevBlockHash)).headerProps.get('totalDifficulty'))
                                     )

            }

            if (newTotalDifficulty === oldTotalDifficulty) {
                return newHead.getLastHash().localeCompare(oldHead.getLastHash()) < 0;
            } else {
                return newTotalDifficulty < oldTotalDifficulty;
            }
        } else {
            return newHeight > oldHeight;
        }
        
        
    }

    shouldInterruptCurrentMining(newHead: BlockOp) { 
        let miningBlock = new BlockOp(this, this._computationPrevBlock, this._computationDifficulty as bigint, '', '', this._coinbase, '')

        return this.shouldAcceptNewHead(newHead, miningBlock)

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