import { Hash } from '@hyper-hyper-space/core';
import { Logger, LogLevel } from '../../../core/dist/util/logging';
import { BlockOp } from './BlockOp';
import { LedgerDelta } from './LedgerDelta';
import { LedgerLike } from './LedgerLike';
import { LedgerSnapshot } from './LedgerSnapshot';

class Ledger implements LedgerLike {

    static logger = new Logger('Ledger', LogLevel.INFO);

    balances: Map<Hash, bigint>;
    appliedTxs: Set<Hash>
    headBlockHash?: Hash;
    headBlockNumber: bigint;

    snapshots: Map<string, LedgerSnapshot>;

    supply: bigint;

    constructor() {
        this.balances = new Map();
        this.appliedTxs = new Set();
        this.headBlockNumber = BigInt(0);

        this.snapshots = new Map();

        this.supply = BigInt(0);
    }

    createDelta(): LedgerDelta {
        return new LedgerDelta(this);
    }

    applyBlockOp(blockOp : BlockOp) {
        const delta = this.createDelta();
        delta.applyBlockOp(blockOp);
        this.applyDelta(delta);
    }

    revertBlockOp(blockOp: BlockOp) {
        const delta = this.createDelta();
        delta.revertBlockOp(blockOp);
        this.applyDelta(delta);
    }

    applyDelta(delta: LedgerDelta) {

        if (!delta.valid) {
            throw new Error('Attempted to apply an invalid ledger delta.')
        }

        if (delta.initialBlockHash !== this.headBlockHash) {
            throw new Error('Cannot apply delta to ledger: head block and initial block do not match.');
        }

        for (const tx in delta.appliedTxs) {
            const oldSize = this.appliedTxs.size;
            this.appliedTxs.add(tx);
            if (this.appliedTxs.size === oldSize) {
                throw new Error('Unexpected state found applying ledger delta: a tx is going to be applied twice.');
            }
        }

        for (const tx in delta.revertedTxs) {
            if (this.appliedTxs.delete(tx)) {
                throw new Error('Unexpected state found applying ledger delta: a tx that was not applied should be reversed.');
            }
        }

        for (const [address, balanceChange] of delta.balanceChanges.entries()) {
            const newBalance = this.getBalance(address) + balanceChange;

            if (newBalance === BigInt(0)) {
                this.balances.delete(address);
            } else {
                this.balances.set(address, newBalance);
            }
        }

        this.supply = this.supply + delta.supplyChange;

        if (this.snapshots.size > 0) {
            const reversal = delta.reverse();
            for (const snapshot of this.snapshots.values()) {
                snapshot.delta = snapshot.delta.chainAfter(reversal);
            }
        }

        this.headBlockHash   = delta.headBlockHash;
        this.headBlockNumber = delta.headBlockNumber;
        
    }

    getHeadBlockHash(): string|undefined {
        return this.headBlockHash;
    }

    getHeadBlockNumber(): bigint {
        return this.headBlockNumber;
    }

    getBalance(address: Hash): bigint {
        const balance = this.balances.get(address);

        if (balance === undefined) {
            return BigInt(0);
        } else {
            return balance;
        }
    }

    getSupply(): bigint {
        return this.supply;
    }

    wasApplied(tx: Hash): boolean {
        return this.appliedTxs.has(tx);
    }

    createSnapshot(): LedgerSnapshot {
        const snapshot = new LedgerSnapshot(this);
        this.snapshots.set(snapshot.id, snapshot);
        return snapshot;
    }

    destroySnapshot(snapshot: LedgerSnapshot) {
        this.destroySnapshotById(snapshot.id);
    }

    destroySnapshotById(id: string) {
        this.snapshots.delete(id);
    }

}

export { Ledger };