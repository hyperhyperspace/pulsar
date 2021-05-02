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

        const bufferChallenge = Buffer.from(challenge, 'hex')
        const challenge256 = Buffer.concat([bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge])
        const result = vdfInstance.generateProofVDF(steps, challenge256);
        const elapsedGen = Date.now() - tGen;
        console.log('Done computing VDF, took ' + elapsedGen + ' millis');

        const tVerif = Date.now();

        console.log('VDF self verification: ' + vdfInstance.verifyProofVDF(steps, challenge256, result));

        const elapsedVerif = Date.now() - tVerif;

        console.log('verification took ' + elapsedVerif + ' millis');

        return Buffer.from(result).toString('hex');
    }
}

export { VDF };