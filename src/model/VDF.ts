//import { Logger, LogLevel } from "util/logging";

import {SlothPermutation} from '@hyper-hyper-space/sloth-permutation';
(global as any).document = { }; // yikes!

class VDF {

    static BITS = 256;

    //static log = new Logger(VDF.name, LogLevel.TRACE)

    static async compute(challenge: string, steps: number): Promise<string> {

        console.log('Creating VDF instance...');
        const blockSize = 256
        const vdfInstance = await SlothPermutation.instantiate(blockSize);
        console.log('Computing VDF...');
        const tGen = Date.now();

        
        const result = vdfInstance.generateProofVDF(steps, Buffer.from(challenge, 'hex'));
        const elapsedGen = Date.now() - tGen;
        console.log('Done computing VDF, took ' + elapsedGen + ' millis');

        const tVerif = Date.now();

        console.log('VDF self verification: ' + vdfInstance.verifyProofVDF(steps, Buffer.from(challenge, 'hex'), result));

        const elapsedVerif = Date.now() - tVerif;

        console.log('verification took ' + elapsedVerif + ' millis');

        return Buffer.from(result).toString('hex');
    }
}

export { VDF };