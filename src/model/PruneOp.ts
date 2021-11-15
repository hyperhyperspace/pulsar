import { Hash, HashedObject, MutationOp, OpHeader, OpHeaderProps } from '@hyper-hyper-space/core';
import { Blockchain } from './Blockchain';

class PruneOp extends MutationOp {

    static className = 'hhs/v0/soliton/PruneOp';
    static heightBinSize = BigInt(32);

    constructor(target?: Blockchain) {
        super(target);
    }

    getClassName(): string {
        return PruneOp.className;
    }

    init(): void {
        
    }

    async validate(references: Map<Hash, HashedObject>): Promise<boolean> {

        references;

        return false;

    }

    getHeaderProps(prevOpHeaders: Map<Hash, OpHeader>): OpHeaderProps {
        prevOpHeaders;

        const props =  new Map();
        props.set('ignore', 1);

        return props;
    }

}

HashedObject.registerClass(PruneOp.className, PruneOp);

export { PruneOp };