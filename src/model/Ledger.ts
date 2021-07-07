import { Hash } from '@hyper-hyper-space/core';
import { BlockOp } from './BlockOp';

class Ledger {

    balances: Map<Hash, bigint>;
    nextBlockNumber: bigint;

    constructor() {
        this.balances = new Map();
        this.nextBlockNumber = BigInt(0);
    }

    processBlock(blockOp: BlockOp) {
        if (blockOp.blockNumber?.getValue() !== this.nextBlockNumber) {
            throw new Error('Cannot update ledger: expected block number ' + this.nextBlockNumber + ' but got block ' + blockOp.blockNumber?.getValue() + ' instead.');
        }


    }

    updateBalance(address: Hash, delta: bigint) {

        const oldBalance = this.balances.get(address);

        const newBalance = (oldBalance === undefined? BigInt(0) : oldBalance) + delta;

        if (newBalance === BigInt(0)) {
            this.balances.delete(address);
        } else {
            this.balances.set(address, newBalance)
        }

    }


}