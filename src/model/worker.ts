import { HashedObject, LiteralContext } from '@hyper-hyper-space/core';
import { parentPort } from 'worker_threads';
//import { Blockchain } from './Blockchain';
import { BlockOp } from './BlockOp';
import { VDF } from './VDF';


class VDFWorker {
    static start() {
    
            parentPort?.on('message', async (q: {challenge: string, steps: bigint, prevOpContext?: LiteralContext, bootstrap: boolean}) => {

                let prevOp: BlockOp | undefined;

                if (q.prevOpContext !== undefined) {
                    prevOp = HashedObject.fromLiteralContext(q.prevOpContext) as BlockOp;
                }

                const comp = BlockOp.initializeComptroller(prevOp);

                let challenge: string;

                if (q.bootstrap) {

                    const bootstrapSteps = comp.getConsensusBootstrapDifficulty();

                    //console.log('Bootstrap VDF Steps: ' + bootstrapSteps + ' steps');
                    console.log('Racing for bootstrap challenge (' + bootstrapSteps + ' steps): "' + q.challenge + '".');
                    const tGen = Date.now();
                    challenge = await VDF.compute(q.challenge, bootstrapSteps as bigint);
                    const elapsedGen = Date.now() - tGen;
                    console.log('Done computing Boostrap VDF, took ' + elapsedGen + ' millisecs')  ;
                    //const tVerif = Date.now();
                    console.log('Result Proof length (bytes) = ', challenge.length / 2)
                    console.log('Bootstrap VDF self verification: ' + await VDF.verify(q.challenge, q.steps, challenge));
                    //const elapsedVerif = Date.now() - tVerif;
                    //console.log('verification took ' + elapsedVerif + ' millisecs');
                } else {
                    challenge = q.challenge;
                }


                console.log('computing vdf...')
                let result = await VDF.compute(challenge, q.steps);
                console.log('done vdf computation.')

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
