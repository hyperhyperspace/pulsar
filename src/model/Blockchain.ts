import { Hashing, HashedObject, MutableObject, MutationOp, StateFilter, Store, Hash, PeerNode } from '@hyper-hyper-space/core';
import { SpaceEntryPoint } from '@hyper-hyper-space/core';
import { HeaderBasedState } from '@hyper-hyper-space/core';
import { OpHeader } from '@hyper-hyper-space/core/dist/data/history/OpHeader';
import { Logger, LogLevel } from '@hyper-hyper-space/core/dist/util/logging';
import { Lock } from '@hyper-hyper-space/core/dist/util/concurrency';


import { Ledger } from './Ledger';
import { LedgerDelta } from './LedgerDelta';

import { MiniComptroller } from './MiniComptroller';

import { BlockOp } from './BlockOp';
import { PruneOp } from './PruneOp';

function pruneSort(op1: MutationOp, op2: MutationOp): number {
    if (op1 instanceof BlockOp) {
        if (op2 instanceof PruneOp) {
            return 1;
        } else if (op2 instanceof BlockOp) {
            const height1 = op1.getBlockNumber();
            const height2 = op2.getBlockNumber();

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
    static forkChoiceLog = new Logger('Fork choice', LogLevel.INFO);
    static loadLog   = new Logger(Blockchain.name, LogLevel.INFO);
    static pruneLog  = new Logger(Blockchain.name, LogLevel.DEBUG);
    

    static className = 'hhs/v0/soliton/Blockchain';

    totalCoins?: string;

    _headBlock?: BlockOp;

    _ledger: Ledger;

    _node?: PeerNode;

    _lastPrune?: bigint;
    _pruneLock: Lock;

    private _loadAllChangesPromise?: Promise<void>;
    private _loadedAllChanges: boolean;
    private _newBlockCallbacks: Set<(blockOp: BlockOp, isNewHead: boolean) => void>;

    constructor(seed?: string, totalCoins?: string) {
        super([BlockOp.className, PruneOp.className]);

        if (seed !== undefined) {
            this.setId(seed);
            if (totalCoins !== undefined)
                this.totalCoins = totalCoins;
            else
                this.totalCoins = "100";
        }

        this._ledger = new Ledger();

        this._pruneLock = new Lock();

        this._loadedAllChanges = false;
        this._newBlockCallbacks = new Set();
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

        let isNewHead = false;

        if (op instanceof BlockOp) {

            Blockchain.loadLog.info('Loading block #' + op.getBlockNumber()?.toString() + ' w/hash ' + op.hash());

            let done = false;

            while (!done) {

                const prevHeadBlockHash = this._headBlock?.hash();

                if (this._headBlock === undefined || await this.shouldAcceptNewHead(op, this._headBlock)) { 
                    isNewHead = true;
                } else {
                    done = true;
                }
    
                if (isNewHead) {
                    const delta = await this.createDeltaToBlockOp(op);
                    
                    // Check that we're still in the same head block, if not, repeat.
                    // Furthermore, check that the delta was created for this very head block.
                    if (prevHeadBlockHash === this._headBlock?.hash() && prevHeadBlockHash === delta.initialBlockHash) {
                        this._ledger.applyDelta(delta);
                        this._headBlock = op;
                        done = true;
                    }
                }
            }

            for (const callback of this._newBlockCallbacks.values()) {
                callback(op, isNewHead);
            }

        }

            /* we're done loading ops & we've just seen a new head block */
        if (this.hasLoadedAllChanges() && this._headBlock !== undefined) {
            const newBlockNumber = this._headBlock.getBlockNumber();
            this.attemptPrune(newBlockNumber);
        }

        return isNewHead;
    }

    async createDeltaToBlockOp(blockOp: BlockOp): Promise<LedgerDelta> {

        const snapshot = this._ledger.createSnapshot();

        try {
            const delta = new LedgerDelta(snapshot);
            const toApply = [blockOp];
    
            let firstToApply = blockOp;
    
            while (firstToApply.getPrevBlockHash() !== delta.getHeadBlockHash()) {
                const expectedBlockNumber = firstToApply.getBlockNumber() - BigInt(1);
                let backtrackDelta = false;
                let backtrackBlock = false;
                if (delta.getHeadBlockNumber() > expectedBlockNumber) {
                    backtrackDelta = true;
                } else if (delta.getHeadBlockNumber() < expectedBlockNumber) {
                    backtrackBlock = true;
                } else {
                    backtrackDelta = true;
                    backtrackBlock = true;
                }
    
                if (backtrackDelta) {
                    const headBlockOp = await this.loadOp(delta.getHeadBlockHash() as Hash) as BlockOp;
                    if (headBlockOp === undefined) {
                        throw new Error('Could not fetch BlockOp ' + delta.getHeadBlockHash() + ' (chain backtrack) while attempting to create a ledger delta ending in BlockOp ' + blockOp?.hash());
                    }
                    delta.revertBlockOp(headBlockOp);
                }
    
                if (backtrackBlock) {
                    const prevBlockOp = await this.loadOp(firstToApply.getPrevBlockHash() as Hash) as BlockOp;
                    if (prevBlockOp === undefined) {
                        throw new Error('Could not fetch BlockOp ' + delta.getHeadBlockHash() + ' (block backtrack) while attempting to create a ledger delta ending in BlockOp ' + blockOp?.hash());
                    }
                    toApply.unshift(prevBlockOp);
                    firstToApply = prevBlockOp;
                }
            }
    
            for (const blockOp of toApply) {
                delta.applyBlockOp(blockOp);
            }
        
            return delta;
        } finally {
            this._ledger.destroySnapshot(snapshot);
        }

        
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

        await this.loadAndWatchForChanges(1024);

        this._node = new PeerNode(resources);
        
        this._node.broadcast(this);
        this._node.sync(this);
    }
    
    async stopSync(): Promise<void> {
        this._node?.stopBroadcast(this);
        this._node?.stopSync(this);
        this._node = undefined;
    }

    isSynchronizing() {
        return this._node !== undefined;
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

        const newHeight = newHead.getBlockNumber();
        const oldHeight = oldHead.getBlockNumber();

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

            const currentNewBlockHeight = currentNewBlock.getBlockNumber();
            const currentOldBlockHeight = currentOldBlock.getBlockNumber();

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

                    const newLocalDifficulty = currentNewBlock.getVdfSteps(); 
                    const oldLocalDifficulty = currentOldBlock.getVdfSteps();

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
                        if (currentNewBlock === undefined) { throw new Error('Op ' + newBlockPrevHash + ', prevOp of the new head op ' + newHead.hash() + ' with #' + newHead.getBlockNumber() + ' d=' + d)} 
                    } else {
                        throw new Error('The forked chain and the old one have different origin blocks, this should be impossible');
                    }
                    const oldBlockPrevHash = currentOldBlock.getPrevBlockHash();
                    if (oldBlockPrevHash !== undefined) {
                        currentOldBlock = await this.loadOp(oldBlockPrevHash) as BlockOp;
                        if (currentOldBlock === undefined) { throw new Error('Op ' + oldBlockPrevHash + ', prevOp of the old head op ' + oldHead.hash() + ' with #' + oldHead.getBlockNumber() + ' d=' + d)} 
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
                oldTotalDifficulty = oldHead.getVdfSteps() + 
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
                const opBlockNumber = op.getBlockNumber();

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

    loadAndWatchForChanges(loadBatchSize?: number): Promise<void> {
        if (this._loadAllChangesPromise === undefined) {
            this._loadAllChangesPromise = super.loadAndWatchForChanges(loadBatchSize).then(() => { this._loadedAllChanges = true; });
        }

        return this._loadAllChangesPromise;
    }

    hasLoadedAllChanges(): boolean {
        return this._loadedAllChanges;
    }

    addNewBlockCallback(callback: ((op: BlockOp, isNewHead: boolean) => void)) {
        this._newBlockCallbacks.add(callback);
    }

    removeNewBlockCallback(callback: ((op: BlockOp, isNewHead: boolean) => void)) {
        this._newBlockCallbacks.delete(callback);
    }

}

HashedObject.registerClass(Blockchain.className, Blockchain);

export { Blockchain };