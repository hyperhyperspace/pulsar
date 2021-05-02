
//import {createHash} from "crypto";
import { Hashing, Hash, HashedObject, MutationOp } from '@hyper-hyper-space/core';
//import { Logger, LogLevel } from '@hyper-hyper-space/core';

import { Blockchain } from './Blockchain';
import { MiniComptroller, FixedPoint } from './MiniComptroller';
//import { VDF } from './VDF';

import {SlothPermutation} from '@hyper-hyper-space/sloth-permutation';
(global as any).document = { }; // yikes!

class BlockchainValueOp extends MutationOp {

    //static log = new Logger(BlockchainValueOp.name, LogLevel.TRACE)

    static className = 'hhs/v0/examples/BlockchainValueOp';

    static vdfInit = async () => {
        const blockSize = 256
        BlockchainValueOp.vdfVerifier = await SlothPermutation.instantiate(blockSize);
        BlockchainValueOp.comptroller = new MiniComptroller();
    };
    static vdfVerifier: any;
    static comptroller: any;
    static coins: bigint = BigInt(0);
    static totalCoins: bigint = MiniComptroller.bootstrapVirtualStake * BigInt(5);

    
    vdfResult?: string;
    
    blockNumber?: bigint;
    movingMaxSpeed?: bigint;
    movingMinSpeed?: bigint;
    blockTimeFactor?: bigint;

    timestampSeconds?: number; 

    constructor(target?: Blockchain, prevOp?: BlockchainValueOp, vdfResult?: string) {
        super(target);

        if (target !== undefined && vdfResult !== undefined) {

            this.timestampSeconds = Date.now() / 1000;

            const blocktime = prevOp !== undefined? 
                                BigInt(this.timestampSeconds - (prevOp.timestampSeconds as number))
                            :
                                MiniComptroller.targetBlockTime; // FIXME: initial block time

            const comp = this.initializeComptroller(prevOp);

            const challenge = this.getChallenge(prevOp?.hash());
            // TODO: warning! replace with VRF seed + hashing with prev block hash.
            const steps = this.getVDFSteps(challenge)

            comp.addBlockSample(blocktime, steps);

            this.blockNumber = comp.getBlockNumber();
            this.movingMaxSpeed = comp.getMovingMaxSpeed();
            this.movingMinSpeed = comp.getMovingMinSpeed();
            this.blockTimeFactor = comp.getBlockTimeFactor();
        }

    }

    getClassName(): string {
        return BlockchainValueOp.className;
    }

    init(): void {
        
    }

    validate(references: Map<Hash, HashedObject>): boolean {

        if (this.blockNumber === undefined || this.vdfResult === undefined) {
            console.log('Object is incomplete.');
            return false;
        }

        if (this.blockNumber < 0) {
            console.log('Sequence number is negative.');
            return false;
        }

        if (this.timestampSeconds === undefined) {
            console.log('Missing timestamp');
            return false;
        }

        if (!super.validate(references)) {
            console.log('Generic op validation failed.');
            return false;
        }

        if (! (this.getTarget() instanceof Blockchain)) {
            console.log('Target is nt a Blockchain instance.');
            return false;
        }

        if (this.getAuthor() !== undefined) {
            console.log('Author is not undefined as it should be.');
            return false;
        }

        if (this.prevOps === undefined) {
            console.log('PrevOps is missing (it should be empty or a singleton - not missing).');
            return false;
        }

        let prev: HashedObject | undefined = undefined;
        
        if (this.prevOps.size() > 0) {

            if (this.prevOps.size() !== 1) {
                console.log('PrevOps size is not 0 or 1.');
                return false;
            }

            prev = references.get(this.prevOps.values().next().value.hash);

            if (!(prev instanceof BlockchainValueOp)) {
                console.log('prevOP is not an instance of BlockchainValueOp.');
                return false;
            }

            if (!prev.getTarget().equals(this.getTarget())) {
                console.log('The prevOp and this op targets differ.');
                return false;
            }
        }

        const prevOp: BlockchainValueOp | undefined = prev;

        {
            
            const blocktime = prevOp !== undefined? 
                                    BigInt((this.timestampSeconds as number) - (prevOp.timestampSeconds as number))
                                :
                                    MiniComptroller.targetBlockTime; // FIXME: initial block time
                            
            const comp = this.initializeComptroller(prev);

            if (!comp.updateOrTestBlockTimeActionable(blocktime)) {
                console.log('Comptroller rejected blockTimeFactor');
                return false;
            }

            if (!comp.updateOrTestSpeedRatioTarget(this.movingMaxSpeed, this.movingMinSpeed)) {
                console.log('Comptroller rejected movingMaxSpeed/movingMinSpeed');
                return false;
            }

        }

        if (this.vdfResult.toUpperCase() !== this.vdfResult) {
            console.log('VDF result is not uppercase');
            return false;
        }

        const challenge = this.getChallenge(prevOp?.hash());
        const challengeBuffer = Buffer.from(challenge, 'hex');
        const challenge256 = Buffer.concat([challengeBuffer,challengeBuffer,challengeBuffer,challengeBuffer,challengeBuffer,challengeBuffer,challengeBuffer,challengeBuffer])
        const resultBuffer = Buffer.from(this.vdfResult, 'hex');
        const steps = this.getVDFSteps(challenge)
        if (!BlockchainValueOp.vdfVerifier.verifyProofVDF(Number(steps), challenge256, resultBuffer)) {
            console.log('VDF verification failed.');
            return false;
        }

        console.log('Successfully received proof for sequence number ' + this.blockNumber + '.');

        return true;

    }

    private getChallenge(prevOpHash?: Hash) {
        let challenge: string;

        if (prevOpHash === undefined) {
            challenge = this.getTarget().getId() as string;
        } else {
            challenge = Hashing.toHex(prevOpHash);
        }

        return challenge;
    }

    private getVDFSteps(challenge: string) {
        // TODO: warning! using the challenge as temporary VRF seed. Replace this with VRF seed hashed with prev hash block!
        const seedVRF = BigInt( '0x'+challenge ) // TODO: warning! replace with VRF seed + hashing with prev block hash.
        const steps = BlockchainValueOp.comptroller.getConsensusDifficulty(
                                                        BlockchainValueOp.coins,
                                                        BlockchainValueOp.totalCoins,
                                                        seedVRF,
                                                    );
        return steps;
    }

    private initializeComptroller(prevOp?: BlockchainValueOp): MiniComptroller {
        const comptroller = new MiniComptroller();

        if (prevOp !== undefined) {
            comptroller.setBlockNumber(prevOp.blockNumber as bigint);
            comptroller.setMovingMaxSpeed(prevOp.movingMaxSpeed as bigint);
            comptroller.setMovingMinSpeed(prevOp.movingMinSpeed as bigint);
            comptroller.setBlockTimeFactor(prevOp.blockTimeFactor as bigint);
        } else {
            comptroller.setBlockTimeFactor(BigInt(1000) * FixedPoint.UNIT)
        }

        comptroller.setMaxSpeedRatio(BigInt(4) * FixedPoint.UNIT);

        return comptroller;

    }

}

HashedObject.registerClass(BlockchainValueOp.className, BlockchainValueOp);

export { BlockchainValueOp as BlockchainValueOp };