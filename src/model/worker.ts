import { parentPort } from 'worker_threads';
import { VDF } from './VDF';

class VDFWorker {
    static start() {
    
            parentPort?.on('message', async (q: {challenge: string, steps: bigint, bootstrap: boolean, bootstrapSteps?: bigint}) => {


                let challenge: string;

                if (q.bootstrap) {
                    console.log('Boostrap VDF Steps: ' + q.bootstrapSteps + ' steps');
                    console.log('Racing for bootstrap challenge (' + q.bootstrapSteps + ' steps): "' + q.challenge + '".');
                    const tGen = Date.now();
                    challenge = await VDF.compute(q.challenge, q.bootstrapSteps as bigint);
                    const elapsedGen = Date.now() - tGen;
                    console.log('Done computing Boostrap VDF, took ' + elapsedGen + ' millisecs')  ;
                    const tVerif = Date.now();
                    console.log('Result Proof length (bytes) = ', challenge.length / 2)
                    console.log('Boostrap VDF self verification: ' + await VDF.verify(q.challenge, q.steps, challenge));
                    const elapsedVerif = Date.now() - tVerif;
                    console.log('verification took ' + elapsedVerif + ' millisecs');
                } else {
                    challenge = q.challenge;
                }


                console.log('computing vdf...')
                let result = await VDF.compute(challenge, q.steps);
                console.log('done')

                if (parentPort !== undefined && parentPort !== null) {
                    parentPort.postMessage(
                        { 
                            bootstrap: q.bootstrap,
                            challenge: q.challenge,
                            steps: q.steps,
                            result: result,
                            bootstrapResult: (q.bootstrap? challenge: undefined)
                        }
                    );

                }

                
            });
    }
}

VDFWorker.start();
