//import { Logger, LogLevel } from "util/logging";

import {SlothPermutation} from './SlothVDF';
(global as any).document = { }; // yikes!

class VDF {

    static BITS = 256;

    //static log = new Logger(VDF.name, LogLevel.TRACE)

    static async compute(challenge: string, steps: number): Promise<string> {

        console.log('Creating VDF instance...');
        const vdfInstance = new SlothPermutation();
        console.log('Computing VDF...');
        const tGen = Date.now();

        const bufferChallenge = Buffer.from(challenge, 'hex')
        //const challenge256 = Buffer.concat([bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge,bufferChallenge])
        const challenge256bits = Buffer.concat([bufferChallenge,bufferChallenge])
        
        console.log('VDF Steps: ' + steps + ' steps');
        const result = vdfInstance.generateBufferProofVDF(BigInt(steps), challenge256bits )
        const elapsedGen = Date.now() - tGen;
        console.log('Done computing VDF, took ' + elapsedGen + ' millis');
        const tVerif = Date.now();
        console.log('Result Proof length (bytes) = ', result.length)
        console.log('VDF self verification: ' + vdfInstance.verifyBufferProofVDF(BigInt(steps), challenge256bits, result));
        const elapsedVerif = Date.now() - tVerif;
        console.log('verification took ' + elapsedVerif + ' millis');

        return Buffer.from(result).toString('hex');
    }
}

export { VDF };