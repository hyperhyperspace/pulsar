
//import {createHash} from "crypto";
import { Hash, HashedObject, Hashing, MutationOp } from '@hyper-hyper-space/core';
import { HashedBigInt } from './HashedBigInt';
//import { Logger, LogLevel } from '@hyper-hyper-space/core';

import { Blockchain } from './Blockchain';
import { MiniComptroller, FixedPoint } from './MiniComptroller';
//import { VDF } from './VDF';

//import {SlothPermutation} from '@hyper-hyper-space/sloth-permutation';
import {SlothPermutation} from './SlothVDF';
import { VDF } from './VDF';
(global as any).document = { }; // yikes!

class BlockchainValueOp extends MutationOp {

    //static log = new Logger(BlockchainValueOp.name, LogLevel.TRACE)

    static className = 'hhs/v0/soliton/BlockchainValueOp';

    static vdfInit = async () => {
        BlockchainValueOp.vdfVerifier = new SlothPermutation();
        BlockchainValueOp.comptroller = new MiniComptroller();
    };
    static vdfVerifier: SlothPermutation;
    static comptroller: MiniComptroller;
    static coins: bigint = BigInt(0);
    static totalCoins: bigint = MiniComptroller.bootstrapVirtualStake * BigInt(2);

    vdfResult?: string;
    vdfBootstrapResult?: string;
    
    blockNumber?: HashedBigInt;
    movingMaxSpeed?: HashedBigInt;
    movingMinSpeed?: HashedBigInt;
    blockTimeFactor?: HashedBigInt;

    timestampSeconds?: number; 

    constructor(target?: Blockchain, prevOp?: BlockchainValueOp, vdfResult?: string, vdfBoostrapResult?: string) {
        super(target);

        if (target !== undefined && vdfResult !== undefined) {

            vdfResult = vdfResult.toLowerCase();

            this.timestampSeconds = Date.now();

            this.vdfResult = vdfResult;

            let blocktime = prevOp !== undefined? 
                                BigInt(Math.floor(this.timestampSeconds - (prevOp.timestampSeconds as number))) * (FixedPoint.UNIT / (BigInt(10)**BigInt(3)))
                            :
                                MiniComptroller.targetBlockTime; // FIXME: initial block time
            if (blocktime == BigInt(0))
                blocktime = BigInt(1) * FixedPoint.UNIT
            console.log('Verifying block with blockTime (secs) = ', Number(blocktime) / Number(FixedPoint.UNIT) )
            const comp = BlockchainValueOp.initializeComptroller(prevOp);

            const challenge = BlockchainValueOp.getChallenge((this.getTarget() as Blockchain), prevOp?.hash());
            console.log('Challenge length (bytes) = ', challenge.length / 2 )
            // TODO: warning! replace with VRF seed + hashing with prev block hash.
            const steps = BlockchainValueOp.getVDFSteps(comp, challenge)

            comp.addBlockSample(blocktime, steps);

            this.blockNumber = new HashedBigInt(comp.getBlockNumber());
            this.movingMaxSpeed = new HashedBigInt(comp.getMovingMaxSpeed());
            this.movingMinSpeed = new HashedBigInt(comp.getMovingMinSpeed());
            this.blockTimeFactor = new HashedBigInt(comp.getBlockTimeFactor());

            if (vdfBoostrapResult) {
                this.vdfBootstrapResult = vdfBoostrapResult;
            }
        }

    }

    getClassName(): string {
        return BlockchainValueOp.className;
    }

    init(): void {
        
    }

    async validate(references: Map<Hash, HashedObject>): Promise<boolean> {

        references;

        if (this.blockNumber === undefined || this.vdfResult === undefined || this.vdfBootstrapResult === undefined) {
            console.log();
            console.log('Object is incomplete.');
            console.log(this.blockNumber);
            console.log(this.vdfResult);
            console.log(this.vdfBootstrapResult);
            console.log();
            return false;
        }

        if (this.blockNumber.getValue() < BigInt(0)) {
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
            
        let blocktime = prevOp !== undefined? 
                            BigInt(Math.floor(this.timestampSeconds - (prevOp.timestampSeconds as number))) * (FixedPoint.UNIT / (BigInt(10)**BigInt(3)))
                        :
                            MiniComptroller.targetBlockTime; // FIXME: initial block time
        if (blocktime == BigInt(0))
            blocktime = BigInt(1) * FixedPoint.UNIT
                        
        const comp = BlockchainValueOp.initializeComptroller(prev);

        const challenge = BlockchainValueOp.getChallenge((this.getTarget() as Blockchain), prevOp?.hash());
        const steps = BlockchainValueOp.getVDFSteps(comp, challenge);

        comp.addBlockSample(blocktime, steps);

        if (this.blockNumber?.getValue() !== comp.getBlockNumber()) {
            console.log('Comptroller rejected blockNumber');
            return false;
        }

        if (this.movingMaxSpeed?.getValue() !== comp.getMovingMaxSpeed()) {
            console.log('Comptroller rejected movingMaxSpeed');
            return false;
        }
                                                         
        if (this.movingMinSpeed?.getValue() !== comp.getMovingMinSpeed()) {
            console.log('Comptroller rejected movingMinSpeed');
            return false;
        }
                                                         
        if (this.blockTimeFactor?.getValue() !== comp.getBlockTimeFactor()) {
            console.log('Comptroller rejected blockTimeFactor');
            return false;
        }
                
        if (this.vdfBootstrapResult.toLowerCase() !== this.vdfBootstrapResult) {
            console.log('VDF boostrap result is not lowercase');
            return false;
        }

        if ((this.vdfBootstrapResult !== undefined) !== comp.isBootstrapPeriod()) {
            console.log('VDF boostrap result is only empty when boostrap period ended.');
            return false;
        }

        if (this.vdfBootstrapResult !== undefined) {
            const bootstrapSteps = comp.getConsensusBoostrapDifficulty();
            if (!VDF.verify(challenge, bootstrapSteps, this.vdfBootstrapResult)) {
                console.log('Failed bootstrap VDF verification');
                return false;
            }
            if (!VDF.verify(this.vdfBootstrapResult, steps, this.vdfResult)) {
                console.log('Failed VDF verification (using bootstrap period result as challenge)');
                return false;
            }
        } else {
            if (!VDF.verify(challenge, steps, this.vdfResult)) {
                console.log('Failed VDF verification');
                return false;
            }
        }

        console.log('Successfully received proof for sequence number ' + this.blockNumber.getValue() + '.');
        
        return true

    }

    static getChallenge(target: Blockchain, prevOpHash?: Hash): string {
        let challenge: string;

        if (prevOpHash === undefined) {
            challenge = target.getInitialChallenge();
        } else {
            challenge = Hashing.sha.sha256hex(prevOpHash);
        }

        return challenge + challenge + challenge + challenge 
    }

    static getVDFSteps(comp: MiniComptroller, challenge: string) {
        // TODO: warning! using the challenge as temporary VRF seed. Replace this with VRF seed hashed with prev hash block!
        const seedVRF = BigInt( '0x'+challenge ) // TODO: warning! replace with VRF seed + hashing with prev block hash.
        const steps = comp.getConsensusDifficulty(
                                            BlockchainValueOp.coins,
                                            BlockchainValueOp.totalCoins,
                                            seedVRF,
                                        );
        return steps;
    }

    static initializeComptroller(prevOp?: BlockchainValueOp): MiniComptroller {
        const comptroller = new MiniComptroller();

        if (prevOp !== undefined) {
            comptroller.setBlockNumber(prevOp.blockNumber?.getValue() as bigint);
            comptroller.setMovingMaxSpeed(prevOp.movingMaxSpeed?.getValue() as bigint);
            comptroller.setMovingMinSpeed(prevOp.movingMinSpeed?.getValue() as bigint);
            comptroller.setBlockTimeFactor(prevOp.blockTimeFactor?.getValue() as bigint);
            comptroller.setSpeedRatio(FixedPoint.divTrunc(comptroller.getMovingMaxSpeed(), comptroller.getMovingMinSpeed()));
        } else {
            comptroller.setBlockTimeFactor(BigInt(1000) * FixedPoint.UNIT)
            comptroller.setMovingMaxSpeed(BigInt(75) * FixedPoint.UNIT);
            comptroller.setMovingMinSpeed(BigInt(70) * FixedPoint.UNIT);
            comptroller.setSpeedRatio(FixedPoint.divTrunc(comptroller.getMovingMaxSpeed(), comptroller.getMovingMinSpeed()));
        }

        comptroller.setMaxSpeedRatio(BigInt(4) * FixedPoint.UNIT);

        return comptroller;

    }

}

HashedObject.registerClass(BlockchainValueOp.className, BlockchainValueOp);

export { BlockchainValueOp as BlockchainValueOp };