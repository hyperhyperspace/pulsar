import { Hashing, HashedObject, MutableObject, MutationOp, StateFilter, Store, Hash, PeerNode } from '@hyper-hyper-space/core';

import { Identity } from '@hyper-hyper-space/core';

import { SpaceEntryPoint } from '@hyper-hyper-space/core';



import { Worker } from 'worker_threads';
import { HeaderBasedState } from '@hyper-hyper-space/core';
import { OpHeader } from '@hyper-hyper-space/core/dist/data/history/OpHeader';
import { Logger, LogLevel } from '@hyper-hyper-space/core/dist/util/logging';
import { Lock } from '@hyper-hyper-space/core/dist/util/concurrency';



import { MiniComptroller, FixedPoint } from './MiniComptroller';

import { BlockOp } from './BlockOp';
import { HashedBigInt } from './HashedBigInt';
import { PruneOp } from './PruneOp';

function pruneSort(op1: MutationOp, op2: MutationOp): number {
    if (op1 instanceof BlockOp) {
        if (op2 instanceof PruneOp) {
            return 1;
        } else if (op2 instanceof BlockOp) {
            const height1 = op1.blockNumber?.getValue() as bigint;
            const height2 = op2.blockNumber?.getValue() as bigint;

            if (height1 < height2) {
                return -1;
            } else if (height1 > height2) {
                return 1;
            } else {
                return op1.getLastHash().localeCompare(op2.getLastHash());
            }
        } else {
            return 0; // never
        }
    } else if (op1 instanceof PruneOp) {
        if (op2 instanceof BlockOp) {
            return -1;
        } else if (op2 instanceof PruneOp) {
            return op1.getLastHash().localeCompare(op2.getLastHash());
        } else {
            return 0; // never
        }
    } else {
        return 0; // never
    }
}

class Blockchain extends MutableObject implements SpaceEntryPoint {

    static pruneFreq = BigInt(16);
    static maxPrunedOps = 128;
    static minPrunedOps = 8;

    //static log = new Logger(Blockchain.name, LogLevel.DEBUG)
    static gossipLog = new Logger(Blockchain.name, LogLevel.INFO);
    static miningLog = new Logger(Blockchain.name, LogLevel.INFO);
    static forkChoiceLog = new Logger('Fork choice', LogLevel.INFO);
    static loadLog   = new Logger(Blockchain.name, LogLevel.INFO);
    static pruneLog  = new Logger(Blockchain.name, LogLevel.DEBUG);
    

    static className = 'hhs/v0/soliton/Blockchain';

    totalCoins?: string;

    _coinbase?: Identity;

    _headBlock?: BlockOp;

    _computation?: Worker;
    _computationDifficulty?: bigint;
    _computationPrevBlock?: BlockOp;
    _computationChallenge?: string;

    _newBlockLock: Lock;

    _autoCompute: boolean;

    _fallBehindCheckInterval: any;
    _fallBehindCheckLastHeights: bigint[];
    _fallBehindStop: boolean;

    _node?: PeerNode;

    _maxSeenBlockNumber?: bigint;

    _lastPrune?: bigint;
    _pruneLock: Lock;

    private _loadedAllChanges: boolean;

    constructor(seed?: string, totalCoins?: string) {
        super([BlockOp.className, PruneOp.className]);

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
        this._fallBehindCheckLastHeights = [];

        this.vrfSeedCallback = this.vrfSeedCallback.bind(this);

        this.computationCallback = this.computationCallback.bind(this);
        this.computationError = this.computationError.bind(this);

        this._pruneLock = new Lock();

        this._loadedAllChanges = false;
    }

    enableMining(coinbase: Identity) {
        this._autoCompute = true;
        this._coinbase = coinbase;

        const historySize = 20;

        if (this._fallBehindCheckInterval === undefined) {
            this._fallBehindCheckInterval = setInterval(() => {

                const stopped = this._fallBehindStop;

                const newHeight = this._headBlock?.blockNumber?.getValue();

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
            Blockchain.miningLog.info('Cancelling mining of a new block - too far behind.');
            return;
        }

        
        if (this._computation === undefined) {
            
            this._computationPrevBlock = this._headBlock;

            BlockOp.computeVrfSeed(this._coinbase as Identity, this._computationPrevBlock?.hash())
                             .then(this.vrfSeedCallback);
            
        } else {
            Blockchain.miningLog.warning('Race was called but a computation is running.');
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

        const challenge = BlockOp.getChallenge(this, result.vrfSeed);
        this._computationChallenge = challenge;
        const steps = BlockOp.getVDFSteps(comp, challenge);

        // TODO: after computing VDF Steps, final challenge must be hashed with the Merkle Root of TXs.

        this._computationDifficulty = steps;
        
        Blockchain.miningLog.info('Mining #' + (comp.getBlockNumber() + BigInt(1)) + ', got ' + steps + ' steps for challenge ending in ' + challenge.slice(-6) + '...');
        Blockchain.miningLog.debug('Dynamic Max VDF Speed (vdfSteps/sec) = ' + FixedPoint.toNumber(comp.getMovingMaxSpeed()) )
        Blockchain.miningLog.debug('Dynamic Min VDF Speed (vdfSteps/sec) = ' + FixedPoint.toNumber(comp.getMovingMinSpeed()) )
        Blockchain.miningLog.debug('Dynamic VDF Speed Ratio (Exponential Difficulty Adj.) = ' + FixedPoint.toNumber(comp.getSpeedRatio()) )
        Blockchain.miningLog.debug('Dynamic Block Time Factor (Linear Difficulty Adj.) = ' + FixedPoint.toNumber(comp.getBlockTimeFactor()) )

        const prevOpContext = this._computationPrevBlock?.toLiteralContext();

        this._computation = new Worker('./dist/model/worker.js');
        this._computation.on('error', this.computationError);
        this._computation.on('message', this.computationCallback);

        this._computation.postMessage({steps: steps, challenge: challenge, prevOpContext: prevOpContext, prevBlockHash: this._computationPrevBlock?.getLastHash(), bootstrap: bootstrap, vrfSeed: result.vrfSeed});
        
    }

    computationError(err: Error) { 
        Blockchain.miningLog.error('Unexpected error while mining: ', err);
    }

    computationCallback(msg: {challenge: string, result: string, steps: bigint, prevBlockHash?: Hash, bootstrapResult?: string, vrfSeed?: string}) {
        this.computationCallbackAsync(msg).then();
    }

    async computationCallbackAsync(msg: {challenge: string, result: string, steps: bigint, prevBlockHash?: Hash, bootstrapResult?: string, vrfSeed?: string}) {
                    
        Blockchain.miningLog.debug('Solved challenge ending in ' + msg.challenge.slice(-6) + '!');
        if (msg.challenge === this._computationChallenge ) {

            if (!(msg.prevBlockHash === this._computationPrevBlock?.getLastHash())) {
                return; // this is a 'ghost compute', another one was started and we're being cancelled.
            }

            let op = new BlockOp(this, this._computationPrevBlock, msg.steps, msg.result, msg.bootstrapResult, this._coinbase, msg.vrfSeed);
            

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
                + ', speed=' + (Number(msg.steps) / (Number(blocktime)/10**FixedPoint.DECIMALS/1000))?.toFixed(4)?.toString()
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
            Blockchain.miningLog.warning('Mismatched challenge - could be normal. Solved one ending in ' + msg.challenge.slice(-6) + ' but expected ' + msg.challenge.slice(-6));
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

            Blockchain.loadLog.info('Loading block #' + op.blockNumber?.getValue()?.toString() + ' w/hash ' + op.hash());

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
                if (this._computation === undefined) {
                    Blockchain.miningLog.info('Going to ignore block #' + op.blockNumber?.getValue()?.toString() + ' (hash ending in ' + op.getLastHash().slice(-6) + '), difficulty: ' + op.vdfSteps?.getValue()?.toString() + ' keeping current head #' + this._headBlock?.blockNumber?.getValue().toString() + ' with a difficulty of ' + this._headBlock?.vdfSteps?.getValue()?.toString() + ', (hash ends in ' + this._headBlock?.getLastHash().slice(-6) + ')');
                } else {
                    Blockchain.miningLog.info('Going to ignore block #' + op.blockNumber?.getValue()?.toString() + ' (hash ending in ' + op.getLastHash().slice(-6) + '), difficulty: ' + op.vdfSteps?.getValue()?.toString() + ' and we are currently mining with a difficulty of ' + this._computationDifficulty?.toString() + ', keeping current head for #' + (prevBlockNumber  + BigInt(1)).toString());
                }              
            }

        }

            /* we're done loading ops & we've just seen a new head block */
        if (this.hasLoadedAllChanges() && this._headBlock !== undefined) {
            const newBlockNumber = this._headBlock.blockNumber?.getValue() as bigint;
            this.attemptPrune(newBlockNumber);
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

        await this.loadAndWatchForChanges(1024);
        this._loadedAllChanges = true;
    }
    
    async stopSync(): Promise<void> {
        this._node?.stopBroadcast(this);
        this._node?.stopSync(this);
    }

    // Caveat: oldHead sometimes may be the block we are currently mining, and therefore
    //         it does not exist in the store (or its causal history).

    async shouldAcceptNewHead(newHead: BlockOp, oldHead: BlockOp): Promise<boolean> {
        
        if (oldHead === undefined) {
            Blockchain.forkChoiceLog.debug('Accepting new head: old head is not present.');
            return true;
        } else if (newHead.equals(oldHead)) {
            Blockchain.forkChoiceLog.debug('Rejecting new head: it is the same as the old one.');
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

        // ok, assume we're inside the finality window: must find the forking point and see which sub-chain
        //                                              is better by looking at the two forking blocks.

        let currentNewBlock = newHead;
        let currentOldBlock = oldHead;
        
        for (let d = 0; d < longestChainFinalityDepth-1; d++) {

            const currentNewBlockHeight = (currentNewBlock.blockNumber as HashedBigInt).getValue();
            const currentOldBlockHeight = (currentOldBlock.blockNumber as HashedBigInt).getValue();

            if (currentNewBlockHeight > currentOldBlockHeight) {             // => currentNewBlockHeight > 0
                const prevHashA = currentNewBlock.getPrevBlockHash();        // => prevHashA !== undefined
                if (prevHashA !== undefined) {
                    const oldCurrentNewBlock = currentNewBlock;
                    currentNewBlock = await this.loadOp(prevHashA) as BlockOp;
                    if (currentNewBlock === undefined) {
                        throw new Error('Block #' + currentNewBlockHeight + ' (hash ' + oldCurrentNewBlock.hash() + ') prev block (hash '+ prevHashA +') is missing from store, this should not be possible!');
                    }
                } else {
                    throw new Error('currentNewBlockHeight should be greater than zero (it is ' + currentNewBlockHeight?.toString(10) + '), but prevBlockhash is undefined.');
                }
            } else if (currentNewBlockHeight < currentOldBlockHeight) {      // => currentOldBlockHeight > 0
                const prevHashB = currentOldBlock.getPrevBlockHash();        // => prevHashB !== undefined
                if (prevHashB !== undefined) {
                    const oldCurrentOldBlock = currentOldBlock;
                    currentOldBlock = await this.loadOp(prevHashB) as BlockOp;
                    if (currentOldBlock === undefined) {
                        throw new Error('Block #' + currentOldBlockHeight + ' (hash ' + oldCurrentOldBlock.hash() + ') prev block (hash '+ prevHashB +') is missing from store, this should not be possible!');
                    }
                } else {
                    throw new Error('currentOldBlockHeight should be greater than zero (it is ' + currentOldBlockHeight?.toString(10) + '), but prevBlockhash is undefined.');
                }
            } else { // same len

                if (currentNewBlock.equals(currentOldBlock)) {

                    // We found a block common to both forks BEFORE finding a block with the same parent.
                    // This implies one chain is a sub-chain of the other. Since we tested above that the
                    // heads of both chains are not the same block, we know it is proper sub-chain.

                    const accept = newHeight > oldHeight;
 
                    Blockchain.forkChoiceLog.debug('The new and old head are in the same chain, accept=' + accept);

                    return accept; // see note above, newHeight == oldHeight is impossible

                } else if (currentNewBlock.getPrevBlockHash() === currentOldBlock.getPrevBlockHash()) {

                    const newLocalDifficulty = currentNewBlock.vdfSteps?.getValue() as bigint; 
                    const oldLocalDifficulty = currentOldBlock.vdfSteps?.getValue() as bigint;

                    if (newLocalDifficulty === oldLocalDifficulty) {

                        const accept = currentNewBlock.hash().localeCompare(currentOldBlock.hash()) < 0;

                        Blockchain.forkChoiceLog.debug('Found common ancester block ' + currentNewBlock.getPrevBlockHash() + 
                                                       ', both new and old following block have same difficulty of ' + newLocalDifficulty +
                                                       ' accepting by comparing hashes, will accept:' + accept);

                        return accept;
                    } else {

                        const accept = newLocalDifficulty < oldLocalDifficulty;

                        Blockchain.forkChoiceLog.debug('Found common ancester block ' + currentNewBlock.getPrevBlockHash() + 
                                                       ', accepting by comparing following block difficuly (new=' + newLocalDifficulty + 
                                                       ' old=' + oldLocalDifficulty + ' accept:' + accept);

                        return accept;
                    }
                } else { 
                    const newBlockPrevHash = currentNewBlock.getPrevBlockHash();
                    if (newBlockPrevHash !== undefined) {
                        currentNewBlock = await this.loadOp(newBlockPrevHash) as BlockOp;
                        if (currentNewBlock === undefined) { throw new Error('Op ' + newBlockPrevHash + ', prevOp of the new head op ' + newHead.hash() + ' with #' + (newHead.blockNumber as HashedBigInt).getValue() + ' d=' + d)} 
                    } else {
                        throw new Error('The forked chain and the old one have different origin blocks, this should be impossible');
                    }
                    const oldBlockPrevHash = currentOldBlock.getPrevBlockHash();
                    if (oldBlockPrevHash !== undefined) {
                        currentOldBlock = await this.loadOp(oldBlockPrevHash) as BlockOp;
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
                const accept=newHead.getLastHash().localeCompare(oldHead.getLastHash()) < 0;
                Blockchain.forkChoiceLog.debug('Outside of window, new and old height match (height=' + newHeight?.toString(10) + '), total difficulties match (tot diff=' + newTotalDifficulty?.toString(10) + '), accepting by comparing hashes, accept: ' + accept);
                return accept;
            } else {
                const accept=newTotalDifficulty < oldTotalDifficulty;
                Blockchain.forkChoiceLog.debug('Outside of window, new and old height match (height=' + newHeight?.toString(10) + '), new total diff=' + newTotalDifficulty?.toString(10) + ', old total diff=' + oldTotalDifficulty?.toString(10) + ', accept: ' + accept);
                return accept;
            }
        } else {
            const accept=newHeight > oldHeight;
            Blockchain.forkChoiceLog.debug('Outside of window, newHeight=' + newHeight?.toString(10) + ', oldHeight=' + oldHeight?.toString(10) + ', accept: ' + accept);
            return accept;
        }
        
        
    }

    shouldInterruptCurrentMining(newHead: BlockOp) { 
        let miningBlock = new BlockOp(this, this._computationPrevBlock, this._computationDifficulty as bigint, '', '', this._coinbase, '')

        return this.shouldAcceptNewHead(newHead, miningBlock)

    }

    getSyncAgentStateFilter(): StateFilter {
        const forkChoiceFilter: StateFilter = async (state: HeaderBasedState, store: Store, isLocal: boolean, localState?: HeaderBasedState) => {
            
            const MAX_FINALITY_DEPTH=MiniComptroller.getMaxSpeedRatioNumber();
            
            let maxHeight = 0;
            const mut = state.mutableObj as Hash;


            if (!isLocal) {

                Blockchain.gossipLog.debug('Filtering gossip for blockchain ' + this.hash() + ' (' + state.terminalOpHeaders?.size() + ' forks in state)');

                if (localState?.terminalOpHeaders !== undefined) {
                    for (const opHeaderLiteral of localState.terminalOpHeaders.values()) {
                        if (opHeaderLiteral.headerProps?.ignore === undefined && opHeaderLiteral.computedHeight > maxHeight) {
                            maxHeight = opHeaderLiteral.computedHeight;
                        }
                    }
                } else {
                    const local = await store.loadTerminalOpsForMutable(mut);
    
                    if (local?.terminalOps !== undefined) {
                        for (const opHash of local?.terminalOps) {
                            const opHistory = await store.loadOpHeader(opHash) as OpHeader;
                            if (opHistory.headerProps?.get('ignore') === undefined && opHistory.computedProps.height > maxHeight) {
                                maxHeight = opHistory.computedProps.height;
                            }
                        }
                    }    
                }
                

            }

            const filteredOpHeaders: OpHeader[] = [];

            if (state.terminalOpHeaders !== undefined) {
                for (const opHeaderLiteral of state.terminalOpHeaders.values()) {
                    if (opHeaderLiteral.headerProps?.ignore === undefined && opHeaderLiteral.computedHeight > maxHeight) {
                        maxHeight = opHeaderLiteral.computedHeight;
                    }
                }

                for (const opHeaderLiteral of state.terminalOpHeaders.values()) {
                    if (opHeaderLiteral.headerProps?.ignore === undefined && opHeaderLiteral.computedHeight+MAX_FINALITY_DEPTH >= maxHeight) {
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

    async attemptPrune(newBlockNumber: bigint) {

        if (this._pruneLock.acquire()) {
            
            try {
                if (this._lastPrune === undefined || newBlockNumber > this._lastPrune) {
                    if (newBlockNumber % Blockchain.pruneFreq === BigInt(0)) {
                        Blockchain.pruneLog.debug('Acquired log, starting prune... (' + this._terminalOps.size + ' unpruned forks)');
                        this._lastPrune = newBlockNumber;
                        await this.prune(newBlockNumber);
                        Blockchain.pruneLog.debug('Prune finished (' + this._terminalOps.size + ' unpruned forks)');
                    }
                }
            } finally {
                this._pruneLock.release();                
            }
        }

    }

    async prune(newBlockNumber: bigint) {
        let toPrune = new Array<MutationOp>();

        const pruneLimit = newBlockNumber - Blockchain.pruneFreq;

        if (pruneLimit <= BigInt(0)) {
            return;
        }

        for (const op of this._terminalOps.values()) {
            if (op instanceof PruneOp) {
                toPrune.push(op);
            } else if (op instanceof BlockOp) {
                const opBlockNumber = op.blockNumber?.getValue() as bigint;

                if (opBlockNumber < pruneLimit) {
                    toPrune.push(op);
                }
            }
        }

        if (toPrune.length > 0) {
            toPrune.sort(pruneSort);

            let batch = new Set<MutationOp>();

            for (const op of toPrune) {
                batch.add(op);

                if (batch.size === Blockchain.maxPrunedOps) {
                    const pruneOp = await this.pruneBatch(batch);
                    batch = new Set();
                    batch.add(pruneOp);
                }
            }

            if (batch.size >= Blockchain.minPrunedOps) {
                await this.pruneBatch(batch);
            }
        }

        
    }

    async pruneBatch(batch: Set<MutationOp>): Promise<PruneOp> {
        const pruneOp = new PruneOp(this);

        pruneOp.setPrevOps(batch.values());

        await this.applyNewOp(pruneOp);

        Blockchain.pruneLog.debug('Saved pruning op with ' + batch.size + ' predecessors');

        return pruneOp;
    }

    hasLoadedAllChanges(): boolean {
        return this._loadedAllChanges;
    }

}

HashedObject.registerClass(Blockchain.className, Blockchain);

export { Blockchain };