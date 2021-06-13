import { Hashing, HashedObject, MutableObject, MutationOp, LiteralContext, StateFilter, Store, Hash } from '@hyper-hyper-space/core';

import { Identity } from '@hyper-hyper-space/core';


import { SpaceEntryPoint } from '@hyper-hyper-space/core';

import { Mesh } from '@hyper-hyper-space/core';
import { LinkupManager } from '@hyper-hyper-space/core';
import { ObjectDiscoveryPeerSource } from '@hyper-hyper-space/core';
import { PeerGroupInfo } from '@hyper-hyper-space/core';
import { IdentityPeer } from '@hyper-hyper-space/core';

import { BlockchainValueOp as BlockchainValueOp } from './BlockchainValueOp';

import { Worker } from 'worker_threads';
import { UsageToken } from '@hyper-hyper-space/core/dist/mesh/service/Mesh';
import { CausalHistoryState } from '@hyper-hyper-space/core/dist/mesh/agents/state/causal/CausalHistoryState';
import { OpCausalHistory } from '@hyper-hyper-space/core/dist/data/history/OpCausalHistory';
import { MiniComptroller } from './MiniComptroller';
//import { Logger, LogLevel } from 'util/logging';

class Blockchain extends MutableObject implements SpaceEntryPoint {

    //static log = new Logger(Blockchain.name, LogLevel.DEBUG)
    

    static className = 'hhs/v0/soliton/Blockchain';

    totalCoins?: string;

    _coinbase?: Identity;

    _headBlock?: BlockchainValueOp;

    _currentMiningPrevBlock?: BlockchainValueOp;

    _values: string[];

    _computation?: Worker;
    _computationTermination?: Promise<Number>;
    _computationDifficulty?: bigint;

    _autoCompute: boolean;

    _mesh?: Mesh;
    _peerGroup?: PeerGroupInfo;

    _peerGroupUsageToken?: UsageToken;
    _syncBlockchainUsageToken?: UsageToken;

    constructor(seed?: string, totalCoins?: string) {
        super([BlockchainValueOp.className]);

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

            const comp = BlockchainValueOp.initializeComptroller(this._headBlock);

            
            console.log('-------------------------------------------------------------')

            // Bootstrap Period Protection pre-VDF.
            const bootstrap = comp.isBootstrapPeriod();

            let prevOpContext: LiteralContext | undefined;

            if (this._headBlock !== undefined) {
                prevOpContext = this._headBlock.toLiteralContext();
            }
            
            BlockchainValueOp.computeVrfSeed(this._coinbase as Identity, this._headBlock?.hash())
                             .then((vrfSeed: (string|undefined)) => 
            {

                if (this._computation !== undefined) {
                    return;
                }

                const challenge = BlockchainValueOp.getChallenge(this, vrfSeed);
                const steps = BlockchainValueOp.getVDFSteps(comp, challenge);
                // TODO: after computing VDF Steps, final challenge must be hashed with the Merkle Root of TXs. 
                this._computationDifficulty = steps;
                console.log('Racing for challenge (' + steps + ' steps): "' + challenge + '".');
                console.log('# Block Number = ', comp.getBlockNumber())
                
                this._computation = new Worker('./dist/model/worker.js');
                this._computation.on('error', (err: Error) => { console.log('ERR');console.log(err)});
                this._computation.on('message', async (msg: {challenge: string, result: string, bootstrapResult?: string}) => {
                    
                    console.log('Solved challenge "' + msg.challenge + '" with: "' + msg.result + '".');
                    if (msg.challenge === challenge ) {

                        

                        let op = new BlockchainValueOp(this, this._headBlock, steps, msg.result, msg.bootstrapResult, this._coinbase, vrfSeed);
    
                        console.log('⛏️⛏️⛏️⛏️ #' + op.blockNumber?.getValue() + ' mined by ' + this._coinbase?.getLastHash());

                        /*if (this._lastBlock !== undefined) {
                            op.setPrevOps(new Set([this._lastBlock]).values());
                        } else {
                            op.setPrevOps(new Set<MutationOp>().values());
                        }*/
    
                        await this.applyNewOp(op);
                        await this.getStore().save(this);
                        
                    } else {
                        console.log('Mismatched challenge - could be normal.');
                    }
                });
                this._computation.postMessage({steps: steps, challenge: challenge, prevOpContext: prevOpContext, bootstrap: bootstrap});
                
            });
            
        } else {
            console.log('Race was called but a computation is running.');
        }
    }

    stopRace() {
        console.log('Going to stop current VDF computation.');
        if (this._computation !== undefined) {
            if (this._computationTermination === undefined) {
                this._computationTermination = this._computation.terminate().then(
                    (ret: number) => {
                        console.log('Stopped VDF computation');
                        this._computation = undefined;
                        this._computationTermination = undefined;
                        this._computationDifficulty = undefined;
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

        if (op instanceof BlockchainValueOp) {

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
                    accept = await BlockchainValueOp.shouldInterruptCurrentMining(this._headBlock, this, this._computationDifficulty as bigint, this._coinbase as Identity, op, this.getResources()?.store as Store);
                    if (!accept) {
                        console.log(' +++ IGNORING RECEIVED BLOCK ' + op.getLastHash() + ', its difficulty is ' + op.vdfSteps + ' and we are currently mining with a difficulty of ' + this._computationDifficulty);
                    }
                } else {
                    accept = await BlockchainValueOp.shouldAcceptNewHead(op, this._headBlock, this.getResources()?.store as Store);
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

        this.loadAndWatchForChanges();
    }
    
    async stopSync(): Promise<void> {
        
        if (this._syncBlockchainUsageToken !== undefined) {
            this._mesh?.stopSyncObjectWithPeerGroup(this._syncBlockchainUsageToken);
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

            console.log('Filtering gossip for blockchain ' + this.hash());

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
                        console.log('Discarding terminal op history ' + opHistoryLiteral.causalHistoryHash + ' (height: ' + opHistoryLiteral.computedHeight + ', current height: ' + maxHeight + ')');
                    }
                }
            }

            console.log('Done filtering gossip for blockcahin ' + this.hash() + ', height post-gossip is ' + maxHeight);

            const forkChoiceState = new CausalHistoryState(mut, filteredOpHistories);

            return forkChoiceState;

        };

        return forkChoiceFilter;
    }

}

HashedObject.registerClass(Blockchain.className, Blockchain);

export { Blockchain };