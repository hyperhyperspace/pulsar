//import { Logger, LogLevel } from "util/logging";

import {SlothPermutation} from './SlothVDF';
(global as any).document = { }; // yikes!

class VDF {

    static BITS = 256;

    //static log = new Logger(VDF.name, LogLevel.TRACE)

    static async compute(challenge: string, steps: bigint): Promise<string> {

        const vdfInstance = new SlothPermutation();
        //const tGen = Date.now();

        const bufferChallenge = Buffer.from(challenge, 'hex')
        //const challenge256 = Buffer.concat([bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge])
        const challenge256bits = bufferChallenge // Buffer.concat([bufferChallenge,bufferChallenge])
        
        const result = vdfInstance.generateBufferProofVDF(steps, challenge256bits )
        //const elapsedGen = Date.now() - tGen;
        //console.log('Done computing VDF, took ' + elapsedGen + ' millis');
        //const tVerif = Date.now();
        //console.log('Result Proof length (bytes) = ', result.length)
        //console.log('VDF self verification: ' + vdfInstance.verifyBufferProofVDF(steps, challenge256bits, result));
        //const elapsedVerif = Date.now() - tVerif;
        //console.log('verification took ' + elapsedVerif + ' millis');

        return Buffer.from(result).toString('hex');
    }

    static async verify(challenge: string, steps: bigint, result: string): Promise<boolean> {

        const vdfInstance = new SlothPermutation();
        const bufferChallenge = Buffer.from(challenge, 'hex')
        const bufferResult = Buffer.from(result, 'hex')

        return vdfInstance.verifyBufferProofVDF(steps, bufferChallenge, bufferResult);

    }
}


export { VDF };