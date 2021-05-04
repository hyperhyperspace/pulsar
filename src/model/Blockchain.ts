import '@hyper-hyper-space/node-env';

import { Hashing, HashedObject, MutableObject, MutationOp } from '@hyper-hyper-space/core';

import { Identity } from '@hyper-hyper-space/core';


import { SpaceEntryPoint } from '@hyper-hyper-space/core';

import { Mesh } from '@hyper-hyper-space/core';
import { LinkupManager } from '@hyper-hyper-space/core';
import { ObjectDiscoveryPeerSource } from '@hyper-hyper-space/core';
import { PeerGroupInfo } from '@hyper-hyper-space/core';
import { IdentityPeer } from '@hyper-hyper-space/core';

import { BlockchainValueOp as BlockchainValueOp } from './BlockchainValueOp';

import { Worker } from 'worker_threads';
//import { Logger, LogLevel } from 'util/logging';

class Blockchain extends MutableObject implements SpaceEntryPoint {

    //static log = new Logger(Blockchain.name, LogLevel.DEBUG)
    

    static className = 'hhs/v0/examples/Blockchain';
    static opClasses = [BlockchainValueOp.className];

    totalCoins?: string;

    _lastOp?: BlockchainValueOp;
    _values: string[];

    _computation?: Worker;
    _computationTermination?: Promise<Number>;
    _autoCompute: boolean;

    _mesh?: Mesh;
    _peerGroup?: PeerGroupInfo;

    constructor(seed?: string, totalCoins?: string) {
        super(Blockchain.opClasses);

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

    startCompute() {
        this._autoCompute = true;
        this.race();
    }

    stopCompute() {
        this._autoCompute = false;
        this.stopRace();
    }

    race() {
        if (this._computation === undefined) {

            const comp = BlockchainValueOp.initializeComptroller(this._lastOp);

            const challenge = BlockchainValueOp.getChallenge(this, this._lastOp?.hash());
            // TODO: warning! replace with VRF seed + hashing with prev block hash.
            const steps = BlockchainValueOp.getVDFSteps(comp, challenge)

            console.log('Racing for challenge (' + steps + ' steps): "' + this.currentChallenge() + '".');

            this._computation = new Worker('./dist/model/worker.js');
            this._computation.on('error', (err: Error) => { console.log('ERR');console.log(err)});
            this._computation.on('message', async (msg: {challenge: string, result: string}) => {
                
                console.log('Solved challenge "' + msg.challenge + '" with: "' + msg.result + '".');

                if (msg.challenge === this.currentChallenge()) {
                    let op = new BlockchainValueOp(this, this._lastOp, msg.result);

                    if (this._lastOp !== undefined) {
                        op.setPrevOps(new Set([this._lastOp]).values());
                    } else {
                        op.setPrevOps(new Set<MutationOp>().values());
                    }

                    await this.applyNewOp(op);
                    await this.getStore().save(this);
                    
                } else {
                    console.log('Mismatched challenge - could be normal.');
                }
            });
            this._computation.postMessage({steps: Number(steps), challenge: this.currentChallenge()});
            
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
                        return ret;
                    }
                );
    
            }
        }
    }

    getInitialChallenge(): string {
        return Hashing.sha.sha256hex(this.getId() as string);
    }

    private currentChallenge(): string {
        let ret = ''
        if (this._lastOp === undefined) {
            ret = this.getInitialChallenge();
        } else {
            ret = Hashing.sha.sha256hex(this._lastOp.hash());
        }
        return ret //.slice(0, ret.length/2)
    }

    /*
    private currentSeq() {
        if (this._lastOp === undefined) {
            return 0;
        } else {
            return (this._lastOp.seq as number) + 1;
        }
    }
    */

    async mutate(op: MutationOp, _isNew: boolean): Promise<boolean> {
       
        let mutated = false;

        if (op instanceof BlockchainValueOp) {

            if (this._lastOp === undefined ||
                !this._lastOp.equals(op)) {

                if (op.prevOps === undefined) {
                    throw new Error('BlockchainValueOp must have a defined prevOps set (even if it is empty).');
                }


                if (op.prevOps.size() === 0) {

                    if (this._lastOp !== undefined) {
                        throw new Error('Initial BlockchainValueOp received, but there are already other ops in this Blockchain.');
                    }
    
                } else {
                    if (this._lastOp === undefined) {
                        throw new Error('Non-initial BlockchainValueOp received, but there are no values in this Blockchain.');
                    }
    
                    if (!this._lastOp.hash() === op.prevOps.values().next().value.hash) {
                        throw new Error('Received BlockchainValueOp does not point to last known Blockchain value.');
                    }
                }

                this._lastOp = op;

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
                mutated = true;
            }

        }

        return mutated;
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

        this._mesh.joinPeerGroup(this._peerGroup);
        this._mesh.syncObjectWithPeerGroup(this._peerGroup.id, this);

        this.loadAndWatchForChanges();
    }
    
    async stopSync(): Promise<void> {

        const peerGroupId = this._peerGroup?.id as string;
        
        this._mesh?.stopSyncObjectWithPeerGroup(peerGroupId, this.hash());
        this._mesh?.stopObjectBroadcast(this.hash());
        this._mesh?.leavePeerGroup(peerGroupId);

        this._mesh = undefined;
        this._peerGroup = undefined;
    }

}

HashedObject.registerClass(Blockchain.className, Blockchain);

export { Blockchain as Blockchain };