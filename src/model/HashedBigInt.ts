import { HashedObject } from '@hyper-hyper-space/core';


class HashedBigInt extends HashedObject {

    static className = 'hhs/v0/soliton/HashedObject';

    hexValue?: string;
    positive?: boolean;

    _value?: bigint;

    constructor(value?: bigint) {
        super();

        if (value !== undefined) {

            if (value >= BigInt(0)) {
                this.hexValue = value.toString(16);
                this.positive = true;
            } else {
                this.hexValue = (-value).toString(16);
                this.positive = false;
            }

            
            this._value = value;
        }
    }

    getClassName(): string {
        return HashedBigInt.className;    
    }

    init(): void {

        const modulus = BigInt('0x' + this.hexValue);

        if (this.positive) {
            this._value = modulus;
        } else {
            this._value = -modulus;
        }
        
    }

    async validate(references: Map<string, HashedObject>): Promise<boolean> {

        references;

        return this.hexValue !== undefined && typeof(this.hexValue) === 'string' &&
               this.positive !== undefined && typeof(this.positive) === 'boolean' &&
               /[0-9a-f]+/.test(this.hexValue) && !/0[0-9a-f]+/.test(this.hexValue);               
    }

    getValue(): bigint {
        if (this._value === undefined) {
            throw new Error('Trying to use uninitialized HashedBigInt');
        }

        return this._value;
    }

}

HashedObject.registerClass(HashedBigInt.className, HashedBigInt);

export { HashedBigInt };