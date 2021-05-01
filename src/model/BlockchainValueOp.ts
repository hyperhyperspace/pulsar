
import {createHash} from "crypto";
import { Hashing, Hash, HashedObject, MutationOp } from '@hyper-hyper-space/core';
//import { Logger, LogLevel } from '@hyper-hyper-space/core';

import { Blockchain } from './Blockchain';
import { VDF } from './VDF';
import { vdfStepsByStakeDiscreteProtected } from './stakes';

import {SlothPermutation} from '@hyper-hyper-space/sloth-permutation';
(global as any).document = { }; // yikes!

class BlockchainValueOp extends MutationOp {

    //static log = new Logger(BlockchainValueOp.name, LogLevel.TRACE)

    static className = 'hhs/v0/examples/BlockchainValueOp';

    static vdfInit = async () => {
        const blockSize = 256
        BlockchainValueOp.vdfVerifier = await SlothPermutation.instantiate(blockSize);
    };
    static vdfVerifier: any;
    static coins: bigint = BigInt(10);

    seq?: number;
    vdfResult?: string;
    
    constructor(target?: Blockchain, seq?: number, vdfResult?: string) {
        super(target);

        if (seq !== undefined && vdfResult !== undefined) {
            this.seq = seq;
            this.vdfResult = vdfResult.toUpperCase();
        }
    }

    getClassName(): string {
        return BlockchainValueOp.className;
    }

    init(): void {
        
    }

    validate(references: Map<Hash, HashedObject>): boolean {

        if (this.seq === undefined || this.vdfResult === undefined) {
            console.log('Object is incomplete.');
            return false;
        }

        if (this.seq < 0) {
            console.log('Sequence number is negative.');
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

        let challenge: string;
        
        if (this.prevOps.size() === 0) {
            if (this.seq !== 0) {
                console.log('PrevOps is empty and sequence is not 0.');
                return false;
            }

            challenge = this.getTarget().getId() as string;
        } else {
            if (this.prevOps.size() !== 1) {
                console.log('PrevOps size is not 0 or 1.');
                return false;
            }

            let prev = references.get(this.prevOps.values().next().value.hash);

            if (!(prev instanceof BlockchainValueOp)) {
                console.log('prevOP is not an instance of BlockchainValueOp.');
                return false;
            }

            if (!prev.getTarget().equals(this.getTarget())) {
                console.log('The prevOp and this op targets differ.');
                return false;
            }

            if ((prev.seq as number) + 1 !== this.seq) {
                console.log('Sequence number is not prevOps + 1.');
                return false;
            }

            challenge = Hashing.toHex(prev.hash());
        }

        // TODO: using the challenge as temporary VRF seed. Replace this with VRF seed hashed with prev hash block!
        const steps = vdfStepsByStakeDiscreteProtected(
            BlockchainValueOp.coins,
            BigInt((this.getTarget() as Blockchain).totalCoins as string),
            BigInt( '0x'+challenge ) // TODO: replace with VRF seed + hashing with prev block hash.
            ); 
        console.log( 'Verify Steps = ' + steps );
        //(this.getTarget() as Blockchain).steps as number;

        if (this.vdfResult.toUpperCase() !== this.vdfResult) {
            console.log('VDF result is not uppercase');
            return false;
        }

        const challengeBuffer = Buffer.from(challenge, 'hex');
        const resultBuffer = Buffer.from(this.vdfResult, 'hex');
        if (!BlockchainValueOp.vdfVerifier.verifyProofVDF(Number(steps), challengeBuffer, resultBuffer)) {
            console.log('VDF verification failed.');
            return false;
        }

        console.log('Successfully received proof for sequence number ' + this.seq + '.');

        return true;

    }

}

HashedObject.registerClass(BlockchainValueOp.className, BlockchainValueOp);

export { BlockchainValueOp as BlockchainValueOp };