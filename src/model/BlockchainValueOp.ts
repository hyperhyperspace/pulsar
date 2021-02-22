
import { Hashing, Hash, HashedObject, MutationOp } from '@hyper-hyper-space/core';
//import { Logger, LogLevel } from '@hyper-hyper-space/core';

import { Blockchain } from './Blockchain';
import { VDF } from './VDF';

const createVdf = require('@subspace/vdf').default;
(global as any).document = { }; // yikes!

class BlockchainValueOp extends MutationOp {

    //static log = new Logger(BlockchainValueOp.name, LogLevel.TRACE)

    static className = 'hhs/v0/examples/BlockchainValueOp';

    static vdfInit = async () => {
        BlockchainValueOp.vdfVerifier = await createVdf();
    };
    static vdfVerifier: any;


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
            //BlockchainValueOp.log.trace('Object is incomplete.');
            return false;
        }

        if (this.seq < 0) {
            //BlockchainValueOp.log.trace('Sequence number is negative.');
            return false;
        }

        if (!super.validate(references)) {
            //BlockchainValueOp.log.trace('Generic op validation failed.');
            return false;
        }

        if (! (this.getTarget() instanceof Blockchain)) {
            //BlockchainValueOp.log.trace('Target is nt a Blockchain instance.');
            return false;
        }

        if (this.getAuthor() !== undefined) {
            //BlockchainValueOp.log.trace('Author is not undefined as it should be.');
            return false;
        }

        if (this.prevOps === undefined) {
            //BlockchainValueOp.log.trace('PrevOps is missing (it should be empty or a singleton - not missing).');
            return false;
        }

        let challenge: string;

        if (this.prevOps.size() === 0) {
            if (this.seq !== 0) {
                //BlockchainValueOp.log.trace('PrevOps is empty and sequence is not 0.');
                return false;
            }

            challenge = this.getTarget().getId() as string;
        } else {
            if (this.prevOps.size() !== 1) {
                //BlockchainValueOp.log.trace('PrevOps size is not 0 or 1.');
                return false;
            }

            let prev = references.get(this.prevOps.values().next().value.hash);

            if (!(prev instanceof BlockchainValueOp)) {
                //BlockchainValueOp.log.trace('prevOP is not an instance of BlockchainValueOp.');
                return false;
            }

            if (!prev.getTarget().equals(this.getTarget())) {
                //BlockchainValueOp.log.trace('The prevOp and this op targets differ.');
                return false;
            }

            if ((prev.seq as number) + 1 !== this.seq) {
                //BlockchainValueOp.log.trace('Sequence number is not prevOps + 1.');
                return false;
            }

            challenge = Hashing.toHex(prev.hash());
        }

        const steps = (this.getTarget() as Blockchain).steps as number;

        if (this.vdfResult.toUpperCase() !== this.vdfResult) {
            //BlockchainValueOp.log.trace('VDF result is not uppercase');
            return false;
        }

        const challengeBuffer = Buffer.from(challenge, 'hex');
        const resultBuffer = Buffer.from(this.vdfResult, 'hex');

        if (!BlockchainValueOp.vdfVerifier.verify(steps, challengeBuffer, resultBuffer, VDF.BITS, true)) {
            //BlockchainValueOp.log.trace('VDF verification failed.');
            return false;
        }

        //BlockchainValueOp.log.trace('Successfully received proof for sequence number ' + this.seq + '.');

        return true;

    }

}

HashedObject.registerClass(BlockchainValueOp.className, BlockchainValueOp);

export { BlockchainValueOp as BlockchainValueOp };