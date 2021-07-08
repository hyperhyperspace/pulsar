import { Hash } from '@hyper-hyper-space/core';
import { BlockOp } from './BlockOp';

class Ledger {

    balances: Map<Hash, bigint>;
    lastBlockNumber: bigint;

    constructor() {
        this.balances = new Map();
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
                const srcAddr = tx.getAuthor()?.hash() as Hash;
                const dstAddr = tx.destination?.hash() as Hash;
                const amount  = tx.amount?.getValue() as bigint;
                this.updateBalance(srcAddr, -amount);
                this.updateBalance(dstAddr, amount);
            }
        }

        this.lastBlockNumber = blockNum;
    }

    updateBalance(address: Hash, delta: bigint) {

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

    }

    canProcessBlock(blockOp: BlockOp): boolean {

        if (blockOp.blockNumber?.getValue() !== this.lastBlockNumber + BigInt(1)) {
            console.log()
            console.log('BLOCK NUMBER, got: ' + blockOp.blockNumber?.getValue().toString())
            console.log()
            return false;
        }

        const tmp = new Map<Hash, bigint>();

        this.updateTmpBalance(tmp, blockOp.getAuthor()?.hash() as Hash, blockOp.blockReward?.getValue() as bigint);

        if (blockOp.transactions !== undefined) {
            for (const tx of blockOp.transactions) {
                const srcAddr = tx.getAuthor()?.hash() as Hash;
                const dstAddr = tx.destination?.hash() as Hash;
                const amount  = tx.amount?.getValue() as bigint;
                const srcBalance = this.updateTmpBalance(tmp, srcAddr, -amount);
                this.updateTmpBalance(tmp, dstAddr, amount);

                if (srcBalance < 0) {
                    console.log()
                    console.log('BALANCE: ' + srcBalance.toString())
                    console.log()
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