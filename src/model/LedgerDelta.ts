import { Hash } from '@hyper-hyper-space/core';
import { Logger, LogLevel } from '../../../core/dist/util/logging';
import { BlockOp } from './BlockOp';
import { Ledger } from './Ledger';

class LedgerDelta {
    static logger = new Logger('LedgerDelta', LogLevel.INFO);

    ledger: Ledger;

    newBalances: Map<Hash, bigint>;
    newTxs: Set<Hash>

    
    prevBlockNumber: bigint;
    currentBlockNumber: bigint;

    prevBlockHash?: Hash;
    currentBlockHash?: Hash;

    valid: boolean;

    constructor(ledger: Ledger) {
        this.ledger = ledger;
        this.newBalances = new Map();
        this.newTxs = new Set();

        this.prevBlockNumber = ledger.lastBlockNumber;
        this.currentBlockNumber = ledger.lastBlockNumber

        this.prevBlockHash = ledger.lastBlockHash;
        this.currentBlockHash = ledger.lastBlockHash;

        this.valid = true;
    }

    processBlock(blockOp: BlockOp) {

        const blockNum = blockOp.blockNumber?.getValue() as bigint;

        if (blockNum !== this.currentBlockNumber + BigInt(1)) {
            throw new Error('Cannot update ledger: expected block number ' + this.currentBlockNumber + ' but got block ' + blockOp.blockNumber?.getValue() + ' instead.');
        }

        const coinbase = blockOp.getAuthor()?.hash() as Hash;
        const reward = blockOp.blockReward?.getValue() as bigint;

        this.updateBalance(coinbase, reward);

        if (blockOp.transactions !== undefined) {
            for (const tx of blockOp.transactions) {

                const txHash = tx.hash();
                
                if (this.ledger.processedTxs.has(txHash) || this.newTxs.has(txHash)) {
                    throw new Error('Block ' + blockOp.hash() + ' is attempting to replay tx ' + txHash);
                }

                this.newTxs.add(txHash);

                const srcAddr = tx.getAuthor()?.hash() as Hash;
                const dstAddr = tx.destination?.hash() as Hash;
                const amount  = tx.amount?.getValue() as bigint;
                const fee     = tx.fee?.getValue() as bigint;
                
                this.updateBalance(srcAddr, -(amount+fee));
                this.updateBalance(dstAddr, amount);
                this.updateBalance(coinbase, fee);
            }
        }

        this.currentBlockNumber = blockNum;

        return this.valid;
    }

    revertBlock(blockOp: BlockOp) {

        if (this.currentBlockHash !== blockOp.hash()) {
            throw new Error('Cannot revert block ' + blockOp.getLastHash() + ', it is not the last applied block.');
        }

        this.currentBlockHash = blockOp.getPrevBlockHash();
        this.currentBlockNumber = this.currentBlockNumber - BigInt(1);

        const coinbase = blockOp.getAuthor()?.hash() as Hash;
        const reward = blockOp.blockReward?.getValue() as bigint;

        this.updateBalance(coinbase, -reward);

        if (blockOp.transactions !== undefined) {
            for (const tx of blockOp.transactions) {

                const txHash = tx.hash();
                
                if (this.newTxs.has(txHash)) {
                    throw new Error('Block ' + blockOp.hash() + ' is attempting to replay tx ' + txHash);
                }

                this.newTxs.add(txHash);

                const srcAddr = tx.getAuthor()?.hash() as Hash;
                const dstAddr = tx.destination?.hash() as Hash;
                const amount  = tx.amount?.getValue() as bigint;
                const fee     = tx.fee?.getValue() as bigint;
                
                this.updateBalance(srcAddr, amount+fee);
                this.updateBalance(dstAddr, -amount);
                this.updateBalance(coinbase, -fee);
            }
        }
    }

    updateBalance(address: Hash, delta: bigint): void {

        let oldBalance = this.newBalances.get(address);

        if (oldBalance === undefined) {
            oldBalance = this.ledger.balances.get(address);
        }        

        const newBalance = (oldBalance === undefined? BigInt(0) : oldBalance) + delta;

        this.newBalances.set(address, newBalance);

        if (newBalance < BigInt(0)) {
            this.valid = false;
        }
    }
}

export { LedgerDelta }