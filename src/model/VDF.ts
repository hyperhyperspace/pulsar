//import { Logger, LogLevel } from "util/logging";

const createVdf = require('@subspace/vdf').default;
(global as any).document = { }; // yikes!

class VDF {

    static BITS = 256;

    //static log = new Logger(VDF.name, LogLevel.TRACE)

    static async compute(challenge: string, steps: number): Promise<string> {

        

        //VDF.log.debug('Creating VDF instance...');
        const vdfInstance = await createVdf();
        //VDF.log.debug('Computing VDF...');
        //const tGen = Date.now();
        const result = vdfInstance.generate(steps, Buffer.from(challenge, 'hex'), VDF.BITS, true);
        //const elapsedGen = Date.now() - tGen;
        //VDF.log.debug('Done computing VDF, took ' + elapsedGen + ' millis');

        //const tVerif = Date.now();

        //VDF.log.debug('VDF self verification: ' + vdfInstance.verify(steps, Buffer.from(challenge, 'hex'), result, VDF.BITS, true));

        //const elapsedVerif = Date.now() - tVerif;

        //VDF.log.debug('verification took ' + elapsedVerif + ' millis');

        return Buffer.from(result).toString('hex');
    }
}

export { VDF };