//import { Logger, LogLevel } from "util/logging";

import {createHash} from "crypto";
import {SlothPermutationWrapper} from './SlothPermutationWrapper';
(global as any).document = { }; // yikes!

class VDF {

    static BITS = 256;

    //static log = new Logger(VDF.name, LogLevel.TRACE)

    static async compute(challenge: string, steps: number): Promise<string> {

        console.log('Creating VDF instance...');
        const vdfInstance = await SlothPermutationWrapper.instantiate();
        console.log('Computing VDF...');
        const tGen = Date.now();

        // TODO: warning !using the challenge as temporary VRF seed. Replace this with VRF seed hashed with prev hash block!
        const randomSeedVRF = createHash('sha512').update(challenge).digest();

        const result = vdfInstance.generateProofVDF(randomSeedVRF,steps, Buffer.from(challenge, 'hex'));
        const elapsedGen = Date.now() - tGen;
        console.log('Done computing VDF, took ' + elapsedGen + ' millis');

        const tVerif = Date.now();

        console.log('VDF self verification: ' + vdfInstance.verifyProofVDF(randomSeedVRF, steps, Buffer.from(challenge, 'hex'), result));

        const elapsedVerif = Date.now() - tVerif;

        console.log('verification took ' + elapsedVerif + ' millis');

        return Buffer.from(result).toString('hex');
    }
}

export { VDF };