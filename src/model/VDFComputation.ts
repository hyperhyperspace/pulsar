import { Hash, LiteralContext } from '@hyper-hyper-space/core';


interface VDFComputation {
    
    onError(callback: (err: Error) => void): void;
    onMessage(callback: (msg: {challenge: string, result: string, steps: bigint, prevBlockHash?: Hash, bootstrapResult?: string, vrfSeed?: string}) => void): void;

    postMessage(msg: {steps: bigint, challenge: string, prevOpContext?: LiteralContext, prevBlockHash?: Hash, bootstrap: boolean, vrfSeed?: string}): void;

    terminate(): Promise<number>;

}

export { VDFComputation }