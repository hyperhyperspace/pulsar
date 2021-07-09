import { Hash } from '@hyper-hyper-space/core';
import { Logger, LogLevel } from '../../../core/dist/util/logging';
import { BlockOp } from './BlockOp';

class Ledger {

    static logger = new Logger('Ledger', LogLevel.INFO);

    balances: Map<Hash, bigint>;
    processedTxs: Set<Hash>
    lastBlockNumber: bigint;

    constructor() {
        this.balances = new Map();
        this.processedTxs = new Set();
        this.lastBlockNumber = BigInt(0);
    }

    processBlock(blockOp: BlockOp) {

        const blockNum = blockOp.blockNumber?.getValue() as bigint;

        if (blockNum !== this.lastBlockNumber + BigInt(1)) {
            throw new Error('Cannot update ledger: expected block number ' + this.lastBlockNumber + ' but got block ' + blockOp.blockNumber?.getValue() + ' instead.');
        }

        this.updateBalance(blockOp.getAuthor()?.hash() as Hash, blockOp.blockReward?.getValue() as bigint);

        if (blockOp.transactions !== undefined) {
            for (const tx of blockOp.transactions) {

                const txHash = tx.hash();
                
                if (this.processedTxs.has(txHash)) {
                    throw new Error('Block ' + blockOp.hash() + ' is attempting to replay tx ' + txHash);
                }

                this.processedTxs.add(txHash);

                const srcAddr = tx.getAuthor()?.hash() as Hash;
                const dstAddr = tx.destination?.hash() as Hash;
                const amount  = tx.amount?.getValue() as bigint;
                
                const newBalance = this.updateBalance(srcAddr, -amount);
                this.updateBalance(dstAddr, amount);

                if (newBalance < BigInt(0)) {
                    throw new Error('Overdraft of address ' + srcAddr + ', balance was ' + newBalance.toString() + ' after tx ' + tx.hash());
                }
            }
        }

        this.lastBlockNumber = blockNum;
    }

    updateBalance(address: Hash, delta: bigint): bigint {

        const oldBalance = this.balances.get(address);

        const newBalance = (oldBalance === undefined? BigInt(0) : oldBalance) + delta;

        if (newBalance === BigInt(0)) {
            this.balances.delete(address);
        } else {

            if (newBalance < BigInt(0)) {
                throw new Error('Cannot update balance: overdraft');
            }

            this.balances.set(address, newBalance)
        }

        return newBalance;
    }

    canProcessBlock(blockOp: BlockOp): boolean {

        if (blockOp.blockNumber?.getValue() !== this.lastBlockNumber + BigInt(1)) {
            Ledger.logger.warning('Attempting to process block ' + blockOp.hash() + ', but it has the wrong block number: ' + blockOp.blockNumber?.getValue().toString() + ' (expected ' + (this.lastBlockNumber + BigInt(1)).toString() + ').');
            return false;
        }

        const tmp = new Map<Hash, bigint>();

        this.updateTmpBalance(tmp, blockOp.getAuthor()?.hash() as Hash, blockOp.blockReward?.getValue() as bigint);

        if (blockOp.transactions !== undefined) {
            for (const tx of blockOp.transactions) {

                const txHash = tx.hash();

                if (this.processedTxs.has(txHash)) {
                    Ledger.logger.warning('Attempting to process block ' + blockOp.hash() + ', but it replays tx ' + tx.hash() + ', that was already processed.');
                    return false;
                }

                const srcAddr = tx.getAuthor()?.hash() as Hash;
                const dstAddr = tx.destination?.hash() as Hash;
                const amount  = tx.amount?.getValue() as bigint;
                const srcBalance = this.updateTmpBalance(tmp, srcAddr, -amount);
                this.updateTmpBalance(tmp, dstAddr, amount);

                if (srcBalance < 0) {
                    Ledger.logger.warning('Attempting to process block ' + blockOp.hash() + ', but tx ' + tx.hash() + ' would overdraft address ' + srcAddr + ' (new balance: ' + srcBalance.toString() + ').');
                    return false;
                }
            }
        }

        return true;
        
    }

    updateTmpBalance(tmp: Map<Hash, bigint>, address: Hash, delta: bigint): bigint {

        let oldBalance = tmp.get(address);

        if (oldBalance === undefined) {
            oldBalance = this.balances.get(address);
        }        

        const newBalance = (oldBalance === undefined? BigInt(0) : oldBalance) + delta;

        tmp.set(address, newBalance);

        return newBalance;
    }


}

export { Ledger };