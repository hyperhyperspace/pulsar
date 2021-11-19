import { RNGImpl } from '@hyper-hyper-space/core';
import { Ledger } from './Ledger';
import { LedgerDelta } from './LedgerDelta';
import { LedgerLike } from './LedgerLike';


class LedgerSnapshot implements LedgerLike {

    id: string;
    delta: LedgerDelta;

    constructor(ledger: Ledger) {
        this.id = new RNGImpl().randomHexString(128);
        this.delta = ledger.createDelta();
    }

    getBalance(address: string): bigint {
        return this.delta.getBalance(address);
    }

    wasApplied(tx: string): boolean {
        return this.delta.wasApplied(tx);
    }

    getHeadBlockHash(): string {
        return this.delta.getHeadBlockHash();
    }

    getHeadBlockNumber(): bigint {
        return this.delta.getHeadBlockNumber()
    }

}

export { LedgerSnapshot }