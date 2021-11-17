import { Identity } from '@hyper-hyper-space/core';

import { Blockchain } from './Blockchain';
import { BlockOp } from './BlockOp';

class Miner {

    blockchain: Blockchain;

    _coinbase?: Identity;

    _computation?: Worker;
    _computationDifficulty?: bigint;
    _computationPrevBlock?: BlockOp;
    _computationChallenge?: string;

    _autoCompute: boolean;

    _fallBehindCheckInterval: any;
    _fallBehindCheckLastHeights: bigint[];
    _fallBehindStop: boolean;

    constructor(blockchain: Blockchain, coinbase: Identity) {
        this.blockchain = blockchain;
        this._coinbase = coinbase;

        this._autoCompute = false;
        this._fallBehindStop = false;
        this._fallBehindCheckLastHeights = [];
    }
    
}