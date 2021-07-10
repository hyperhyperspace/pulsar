import { Hashing, HashedObject, MutableObject, MutationOp, LiteralContext, StateFilter, Store, Hash, MutableSet, Resources } from '@hyper-hyper-space/core';

import { Identity } from '@hyper-hyper-space/core';

import { SpaceEntryPoint } from '@hyper-hyper-space/core';

import { Mesh } from '@hyper-hyper-space/core';
import { LinkupManager } from '@hyper-hyper-space/core';
import { ObjectDiscoveryPeerSource } from '@hyper-hyper-space/core';
import { PeerGroupInfo } from '@hyper-hyper-space/core';
import { IdentityPeer } from '@hyper-hyper-space/core';

import { BlockOp } from './BlockOp';

import { Worker } from 'worker_threads';
import { UsageToken } from '@hyper-hyper-space/core/dist/mesh/service/Mesh';
import { CausalHistoryState } from '@hyper-hyper-space/core/dist/mesh/agents/state/causal/CausalHistoryState';
import { OpCausalHistory } from '@hyper-hyper-space/core/dist/data/history/OpCausalHistory';
import { MiniComptroller, FixedPoint } from './MiniComptroller';
import { Logger, LogLevel } from '../../../core/dist/util/logging';
import { Transaction } from './Transaction';
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

    _values: string[];

    _initializing: boolean;

    _computation?: Worker;
    _computationTermination?: Promise<Number>;
    _computationDifficulty?: bigint;
    _computationPrevBlock?: BlockOp;

    _autoCompute: boolean;

    _mesh?: Mesh;
    _peerGroup?: PeerGroupInfo;

    _peerGroupUsageToken?: UsageToken;
    _syncBlockchainUsageToken?: UsageToken;

    _maxSeenBlockNumber?: bigint;
    _newerTxPool?: MutableSet<Transaction>;
    _newerTxPoolUsageToken?: UsageToken;
    _olderTxPool?: MutableSet<Transaction>;
    _olderTxPoolUsageToken?: UsageToken;

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
        this._initializing = false;
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
    
                        Blockchain.miningLog.info('⛏️⛏️⛏️⛏️ #' + op.blockNumber?.getValue() + ' mined by us with coinbase ' + this._coinbase?.getLastHash() + ', block hash ends in ' + op.hash().slice(-6));

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

    async mutate(op: MutationOp, _isNew: boolean): Promise<boolean> {

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

                this.updateTxPools();

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

        this._mesh = resources.mesh;

        if (this._mesh === undefined) {
            throw new Error('Cannot start sync: mesh is missing from configured resources.');
        }

        let linkupServers = resources.config.linkupServers === undefined?
                            [LinkupManager.defaultLinkupServer] : resources.config.linkupServers;


        let localIdentity = resources.config.id as Identity;

        const localPeer     = await new IdentityPeer(linkupServers[0] as string, localIdentity.hash(), localIdentity).asPeer();

        this._mesh.startObjectBroadcast(this, linkupServers, [localPeer.endpoint]);

        let peerSource = new ObjectDiscoveryPeerSource(this._mesh, this, linkupServers, localPeer.endpoint, IdentityPeer.getEndpointParser(resources.store));

        this._peerGroup = {
            id: 'sync-for-' + this.hash(),
            localPeer: localPeer,
            peerSource: peerSource
        }

        this._peerGroupUsageToken      = this._mesh.joinPeerGroup(this._peerGroup);
        this._syncBlockchainUsageToken = this._mesh.syncObjectWithPeerGroup(this._peerGroup.id, this);

        this._initializing = true;
        await this.loadAndWatchForChanges();
        this._initializing = false;

        this.updateTxPools();
    }
    
    async stopSync(): Promise<void> {
        
        if (this._syncBlockchainUsageToken !== undefined) {
            this._mesh?.stopSyncObjectWithPeerGroup(this._syncBlockchainUsageToken);
        }

        if (this._newerTxPoolUsageToken !== undefined) {
            this._mesh?.stopSyncObjectWithPeerGroup(this._newerTxPoolUsageToken);
            this._newerTxPoolUsageToken = undefined;
        }

        if (this._olderTxPoolUsageToken !== undefined) {
            this._mesh?.stopSyncObjectWithPeerGroup(this._olderTxPoolUsageToken);
        }



        this._mesh?.stopObjectBroadcast(this.hash());

        if (this._peerGroupUsageToken !== undefined) {
            this._mesh?.leavePeerGroup(this._peerGroupUsageToken);
        }
        

        this._mesh = undefined;
        this._peerGroup = undefined;
    }

    getSyncAgentStateFilter(): StateFilter {
        const forkChoiceFilter: StateFilter = async (state: CausalHistoryState, store: Store) => {


            const MAX_FINALITY_DEPTH=MiniComptroller.getMaxSpeedRatioNumber();

            const mut = state.mutableObj as Hash;

            const local = await store.loadTerminalOpsForMutable(mut);

            let maxHeight = 0;

            Blockchain.gossipLog.debug('Filtering gossip for blockchain ' + this.hash() + ' (' + state.terminalOpHistories?.size() + ' forks in state)');

            if (local?.terminalOps !== undefined) {
                for (const opHash of local?.terminalOps) {
                    const opHistory = await store.loadOpCausalHistory(opHash) as OpCausalHistory;
                    if (opHistory.computedProps.height > maxHeight) {
                        maxHeight = opHistory.computedProps.height;
                    }
                }
            }

            const filteredOpHistories: OpCausalHistory[] = [];

            if (state.terminalOpHistories !== undefined) {
                for (const opHistoryLiteral of state.terminalOpHistories.values()) {
                    if (opHistoryLiteral.computedHeight > maxHeight) {
                        maxHeight = opHistoryLiteral.computedHeight;
                    }
                }

                for (const opHistoryLiteral of state.terminalOpHistories.values()) {
                    if (opHistoryLiteral.computedHeight+MAX_FINALITY_DEPTH >= maxHeight) {
                        filteredOpHistories.push(new OpCausalHistory(opHistoryLiteral));
                    } else {
                        Blockchain.gossipLog.trace('Discarding terminal op history ' + opHistoryLiteral.causalHistoryHash + ' (height: ' + opHistoryLiteral.computedHeight + ', current height: ' + maxHeight + ')');
                    }
                }
            }

            Blockchain.gossipLog.debug('Done filtering gossip for blockcahin ' + this.hash() + ', height post-gossip is ' + maxHeight);

            const forkChoiceState = new CausalHistoryState(mut, filteredOpHistories);

            return forkChoiceState;

        };

        return forkChoiceFilter;
    }

    private updateTxPools(headBlockNumber?: bigint) {

        if (  
                headBlockNumber !== undefined && 
                (this._maxSeenBlockNumber === undefined || headBlockNumber > this._maxSeenBlockNumber)
            
            ) {

                this._maxSeenBlockNumber = headBlockNumber;
        }

        let lowerSeed: bigint;
        let higherSeed: bigint;

        if (this._maxSeenBlockNumber === undefined || this._maxSeenBlockNumber < BigInt(180)) {
            lowerSeed  = BigInt(0);
            higherSeed = BigInt(90);
        } else {
            const mult = this._maxSeenBlockNumber / BigInt(90);
            lowerSeed  = (mult - BigInt(1)) * BigInt(90);
            higherSeed = mult * BigInt(90);
        }

        const lowerSeedHash = new HashedBigInt(lowerSeed).hash();
        const higherSeedHash = new HashedBigInt(higherSeed).hash();

        if (this._newerTxPool === undefined) {
            this._newerTxPool = new MutableSet();
            this._newerTxPool.setId(higherSeedHash);
            this._newerTxPool.setResources(this.getResources() as Resources);
        }

        if (this._olderTxPool === undefined) {
            this._olderTxPool = new MutableSet();
            this._olderTxPool.setId(lowerSeedHash);
            this._olderTxPool.setResources(this.getResources() as Resources);
        }

        if (this._mesh !== undefined) {

            if (this._newerTxPoolUsageToken === undefined) {
                this._newerTxPoolUsageToken = this._mesh.syncObjectWithPeerGroup(this._peerGroup?.id as string, this._newerTxPool);
            }
    
            if (this._olderTxPoolUsageToken === undefined) {
                this._olderTxPoolUsageToken = this._mesh.syncObjectWithPeerGroup(this._peerGroup?.id as string, this._olderTxPool);
            }
        }

        
        if (this._newerTxPool.getId() === lowerSeedHash) {
            // roll the pools

            if (this._mesh !== undefined && this._olderTxPoolUsageToken !== undefined) {
                this._mesh.stopSyncObjectWithPeerGroup(this._olderTxPoolUsageToken as UsageToken);
            }
            
            this._olderTxPool           = this._newerTxPool;
            this._olderTxPoolUsageToken = this._newerTxPoolUsageToken;

            this._newerTxPool           = new MutableSet();
            this._newerTxPool.setId(higherSeedHash);
            this._newerTxPool.setResources(this.getResources() as Resources);

            if (this._mesh !== undefined) {
                this._newerTxPoolUsageToken = this._mesh.syncObjectWithPeerGroup(this._peerGroup?.id as string, this._newerTxPool);
            }
        }


    }

}

HashedObject.registerClass(Blockchain.className, Blockchain);

export { Blockchain };