import { HashedObject, Identity, RNGImpl } from "@hyper-hyper-space/core";
import { Blockchain } from "./Blockchain";
import { HashedBigInt } from "./HashedBigInt";


class Transaction extends HashedObject {

    static className = 'hhs/v0/pulsar/Transaction';

    blockchain?: Blockchain;
    destination?: Identity;
    amount?: HashedBigInt;
    fee?: HashedBigInt;
    nonce?: string;

    constructor(blockchain?: Blockchain, source?: Identity, destination?: Identity, amount?: bigint, fee?: bigint) {
        super();

        if (blockchain !== undefined) {

            this.blockchain = blockchain;

            if (source === undefined) {
                throw new Error('Transaction source is missing.');
            }

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

            if (fee === undefined) {
                throw new Error('Transaction fee is missing.');
            }

            if (fee < 0) {
                throw new Error('Transaction fee must be greater than zero, received: ' + fee.toString() + '.');
            }

            this.blockchain = blockchain;
            this.destination = destination;
            this.amount = new HashedBigInt(amount);
            this.fee    = new HashedBigInt(fee);
            this.setAuthor(source);
            this.nonce = new RNGImpl().randomHexString(128);
            
        }

    }

    getClassName(): string {
        return Transaction.className;
    }

    init(): void {
        
    }

    async validate(references: Map<string, HashedObject>): Promise<boolean> {
        
        references;

        if (this.blockchain === undefined) {
            return false;
        }

        if (!(this.blockchain instanceof Blockchain)) {
            return false;
        }

        if (this.getAuthor() === undefined) {
            return false;
        }

        if (this.destination === undefined) {
            return false;
        }

        if (this.nonce === undefined) {
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

        if (this.fee === undefined) {
            return false;
        }

        if (!(this.fee instanceof HashedBigInt)) {
            return false;
        }

        if (this.fee.getValue() < BigInt(0)) {
            return false;
        }

        if (!(typeof(this.nonce) === 'string')) {
            return false;
        }

        if (this.nonce.length !== 128 / 4) {
            return false;
        }

        return true;

    }
}

HashedObject.registerClass(Transaction.className, Transaction);

export { Transaction };