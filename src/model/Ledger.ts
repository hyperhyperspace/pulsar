import { Hash } from '@hyper-hyper-space/core';
import { Logger, LogLevel } from '../../../core/dist/util/logging';
import { LedgerDelta } from './LedgerDelta';

class Ledger {

    static logger = new Logger('Ledger', LogLevel.INFO);

    balances: Map<Hash, bigint>;
    processedTxs: Set<Hash>
    lastBlockHash?: Hash;
    lastBlockNumber: bigint;

    constructor() {
        this.balances = new Map();
        this.processedTxs = new Set();
        this.lastBlockNumber = BigInt(0);
    }

    createDelta(): LedgerDelta {
        return new LedgerDelta(this);
    }

    apply(delta: LedgerDelta) {

        if (!delta.valid) {
            throw new Error('Attempted to apply invalid delta to ledger.');
        }

        

    }

}

export { Ledger };