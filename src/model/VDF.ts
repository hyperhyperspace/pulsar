//import { Logger, LogLevel } from "util/logging";

const createVdf = require('@subspace/vdf').default;
(global as any).document = { }; // yikes!

class VDF {

    static BITS = 256;

    //static log = new Logger(VDF.name, LogLevel.TRACE)

    static async compute(challenge: string, steps: number): Promise<string> {

        

        console.log('Creating VDF instance...');
        const vdfInstance = await createVdf();
        console.log('Computing VDF...');
        const tGen = Date.now();
        const result = vdfInstance.generate(steps, Buffer.from(challenge, 'hex'), VDF.BITS, true);
        const elapsedGen = Date.now() - tGen;
        console.log('Done computing VDF, took ' + elapsedGen + ' millis');

        const tVerif = Date.now();

        console.log('VDF self verification: ' + vdfInstance.verify(steps, Buffer.from(challenge, 'hex'), result, VDF.BITS, true));

        const elapsedVerif = Date.now() - tVerif;

        console.log('verification took ' + elapsedVerif + ' millis');

        return Buffer.from(result).toString('hex');
    }
}

export { VDF };