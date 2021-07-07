import { HashedObject, Identity } from "@hyper-hyper-space/core";
import { HashedBigInt } from "./HashedBigInt";


class Transaction extends HashedObject {

    static className = 'hhs/v0/soliton/Transaction';

    destination?: Identity;
    amount?: HashedBigInt;

    constructor(source?: Identity, destination?: Identity, amount?: bigint) {
        super();

        if (source !== undefined) {

            if (destination === undefined) {
                throw new Error('Transaction destination is missing.');
            }

            if (source.equals(destination)) {
                throw new Error('Transaction source and destination cannot be the same.');
            }

            if (amount === undefined) {
                throw new Error('Transaction amount is missing.');
            }

            if (amount <= 0) {
                throw new Error('Transaction amount must be greater than zero, received: ' + amount.toString() + '.');
            }

            this.destination = destination;
            this.amount = new HashedBigInt(amount);
            this.setAuthor(source);

        }

    }

    getClassName(): string {
        return Transaction.className;
    }

    init(): void {
        
    }

    async validate(references: Map<string, HashedObject>): Promise<boolean> {
        
        references;

        if (this.getAuthor() === undefined) {
            return false;
        }

        if (this.destination === undefined) {
            return false;
        }

        if (!(this.destination instanceof Identity)) {
            return false;
        }

        if (this.destination.equals(this.getAuthor())) {
            return false;
        }

        if (this.amount === undefined) {
            return false;
        }

        if (!(this.amount instanceof HashedBigInt)) {
            return false;
        }

        if (this.amount.getValue() <= BigInt(0)) {
            return false;
        }

        return true;

    }
}

HashedObject.registerClass(Transaction.className, Transaction);

export { Transaction };