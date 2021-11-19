import { Hash } from '@hyper-hyper-space/core';
import { Logger, LogLevel } from '../../../core/dist/util/logging';
import { BlockOp } from './BlockOp';
import { LedgerLike } from './LedgerLike';

class LedgerDelta {
    static logger = new Logger('LedgerDelta', LogLevel.INFO);

    ledger: LedgerLike;

    balanceChanges: Map<Hash, bigint>;

    appliedTxs : Set<Hash>;
    revertedTxs: Set<Hash>;

    initialBlockNumber: bigint;
    initialBlockHash?: Hash;

    headBlockHash?: Hash;
    headBlockNumber: bigint;


    valid: boolean;

    constructor(ledger: LedgerLike) {
        this.ledger = ledger;
        this.balanceChanges = new Map();
        this.appliedTxs = new Set();
        this.revertedTxs = new Set();

        this.initialBlockHash   = ledger.getHeadBlockHash();
        this.initialBlockNumber = ledger.getHeadBlockNumber();

        this.headBlockHash   = this.initialBlockHash;
        this.headBlockNumber = this.initialBlockNumber;

        this.valid = true;
    }

    applyBlockOp(blockOp: BlockOp) {

        if (this.headBlockHash !== blockOp.getPrevBlockHash()) {
            throw new Error('Cannot update ledger: expected current block to be ' + blockOp.getPrevBlockHash() + ' but we are on ' + this.headBlockHash + ' instead.');
        }

        const coinbase = blockOp.getAuthor()?.hash() as Hash;
        const reward   = blockOp.getBlockReward();

        this.updateBalance(coinbase, reward);

        if (blockOp.transactions !== undefined) {
            for (const tx of blockOp.transactions) {

                const txHash = tx.hash();
                
                if (this.appliedTxs.has(txHash) || (!this.revertedTxs.has(txHash) && this.ledger.wasApplied(txHash))) {
                    this.valid = false;
                }
                
                if (!this.revertedTxs.delete(txHash)) {
                    this.appliedTxs.add(txHash);
                }

                const srcAddr = tx.getAuthor()?.hash() as Hash;
                const dstAddr = tx.destination?.hash() as Hash;
                const amount  = tx.amount?.getValue() as bigint;
                const fee     = tx.fee?.getValue() as bigint;
                
                this.updateBalance(srcAddr, -(amount+fee));
                this.updateBalance(dstAddr, amount);
                this.updateBalance(coinbase, fee);
            }
        }

        this.headBlockNumber = blockOp.getBlockNumber();
        this.headBlockHash   = blockOp.hash();
    }

    revertBlockOp(blockOp: BlockOp) {

        if (this.headBlockHash !== blockOp.hash()) {
            throw new Error('Cannot revert block ' + blockOp.getLastHash() + ', it is not the last applied block.');
        }

        this.headBlockHash   = blockOp.getPrevBlockHash();
        this.headBlockNumber = this.headBlockNumber - BigInt(1);

        const coinbase = blockOp.getAuthor()?.hash() as Hash;
        const reward   = blockOp.getBlockReward() as bigint;

        this.updateBalance(coinbase, -reward);

        if (blockOp.transactions !== undefined) {
            for (const tx of blockOp.transactions) {

                const txHash = tx.hash();

                if (!this.appliedTxs.delete(txHash)) {
                    this.revertedTxs.add(txHash);
                }
                

                const srcAddr = tx.getAuthor()?.hash() as Hash;
                const dstAddr = tx.destination?.hash() as Hash;
                const amount  = tx.amount?.getValue() as bigint;
                const fee     = tx.fee?.getValue() as bigint;
                
                this.updateBalance(srcAddr, amount+fee);
                this.updateBalance(dstAddr, -amount);
                this.updateBalance(coinbase, -fee);
            }
        }

        this.headBlockHash   = blockOp.getPrevBlockHash();
        this.headBlockNumber = blockOp.getBlockNumber() - BigInt(1);
    }

    updateBalance(address: Hash, updateAmount: bigint): void {

        const oldChange = this.balanceChanges.get(address);
        let newChange: bigint;

        if (oldChange === undefined) {
            newChange = updateAmount;
        } else {
            newChange = oldChange + updateAmount;
        }

        if (newChange === BigInt(0)) {
            this.balanceChanges.delete(address);
        } else {
            this.balanceChanges.set(address, newChange);
        }
        
        const newBalance = this.getBalance(address);

        if (newBalance < BigInt(0)) {
            this.valid = false;
        }
    }

    getHeadBlockHash(): string|undefined {
        return this.headBlockHash;
    }
    
    getHeadBlockNumber(): bigint {
        return this.headBlockNumber;
    }

    getBalance(address: Hash): bigint {
        let balance = this.ledger.getBalance(address);

        const change = this.balanceChanges.get(address);

        if (change !== undefined) {
            balance = balance + change;
        }

        return balance;
    }

    wasApplied(tx: Hash): boolean {
        return this.appliedTxs.has(tx) || (!this.revertedTxs.has(tx) && this.ledger.wasApplied(tx));
    }

    chainAfter(delta: LedgerDelta): LedgerDelta {

        if (delta.headBlockHash !== this.initialBlockHash) {
            throw new Error('Cannot chain ledger deltas, blocks do not match.')
        }

        let result = new LedgerDelta(delta.ledger);

        result.initialBlockHash   = delta.initialBlockHash;
        result.initialBlockNumber = delta.initialBlockNumber;

        result.headBlockHash   = this.headBlockHash;
        result.headBlockNumber = this.headBlockNumber;

        for (const tx of this.appliedTxs) {
            result.appliedTxs.add(tx);
        }

        for (const tx of delta.appliedTxs) {
            if (!this.revertedTxs.has(tx)) {
                result.appliedTxs.add(tx);
            }
        }

        for (const tx of this.revertedTxs) {
            result.revertedTxs.add(tx);
        }

        for (const tx of delta.appliedTxs) {
            if (!this.appliedTxs.has(tx)) {
                result.revertedTxs.add(tx);
            }
        }

        for (const [address, balance] of delta.balanceChanges.entries()) {
            this.updateBalance(address, balance);
        }

        for (const [address, balance] of this.balanceChanges.entries()) {
            this.updateBalance(address, balance);
        }

        return result;
    }

    reverse(): LedgerDelta {
        const result = new LedgerDelta(this.ledger);

        for (const tx of this.appliedTxs) {
            result.revertedTxs.add(tx);
        }

        for (const tx of this.revertedTxs) {
            result.appliedTxs.add(tx);
        }

        for (const [address, balanceChange] of this.balanceChanges.entries()) {
            result.balanceChanges.set(address, -balanceChange);
        }

        return result;
    }
}

export { LedgerDelta }