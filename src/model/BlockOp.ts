
//import {createHash} from "crypto";
import { Hash, HashedObject, Hashing, Identity, MutationOp } from '@hyper-hyper-space/core';
import { HashedBigInt } from './HashedBigInt';
//import { Logger, LogLevel } from '@hyper-hyper-space/core';

import { Blockchain } from './Blockchain';
import { MiniComptroller, FixedPoint } from './MiniComptroller';
//import { VDF } from './VDF';

//import {SlothPermutation} from '@hyper-hyper-space/sloth-permutation';
import {SlothPermutation} from './SlothVDF';
import { VDF } from './VDF';
import { OpHeader, OpHeaderProps } from '@hyper-hyper-space/core/dist/data/history/OpHeader';
import { Logger, LogLevel } from '../../../core/dist/util/logging';

import { Transaction } from './Transaction';

(global as any).document = { }; // yikes!

const MAX_TX_PER_BLOCK = 4096;

class BlockOp extends MutationOp {

    static logger = new Logger(BlockOp.name, LogLevel.INFO)

    static className = 'hhs/v0/soliton/BlockOp';

    static vdfInit = async () => {
        BlockOp.vdfVerifier = new SlothPermutation();
        BlockOp.comptroller = new MiniComptroller();
    };
    static vdfVerifier: SlothPermutation;
    static comptroller: MiniComptroller;
    static coins: bigint = BigInt(0);
    static totalCoins: bigint = MiniComptroller.bootstrapVirtualStake * BigInt(4);
    
    blockNumber?: HashedBigInt;
    movingMaxSpeed?: HashedBigInt;
    movingMinSpeed?: HashedBigInt;
    blockTimeFactor?: HashedBigInt;

    vdfSteps?: HashedBigInt;

    vrfSeed?: string;

    vdfResult?: string;
    vdfBootstrapResult?: string;

    transactions?: Transaction[];
    blockReward?: HashedBigInt;

    timestampMillisecs?: HashedBigInt;

    constructor(target?: Blockchain, prevOp?: BlockOp, steps?: bigint, vdfResult?: string, vdfBootstrapResult?: string, coinbase?: Identity, vrfSeed?: string, transactions?: Transaction[]) {
        super(target);

        if (target !== undefined && vdfResult !== undefined && steps !== undefined && coinbase !== undefined) {

            this.setAuthor(coinbase);

            if (prevOp !== undefined) {
                this.setPrevOps([prevOp].values());
            }

            vdfResult = vdfResult.toLowerCase();

            this.vrfSeed = vrfSeed;

            this.timestampMillisecs = new HashedBigInt(BigInt(Math.floor(Date.now() * 10**3)) * BigInt(10)**BigInt(FixedPoint.DECIMALS - 3));

            this.vdfSteps  = new HashedBigInt(steps);
            this.vdfResult = vdfResult;

            let blocktime = prevOp !== undefined? 
                                (this.timestampMillisecs?.getValue() as bigint) - (prevOp.timestampMillisecs?.getValue() as bigint)
                            :
                                MiniComptroller.targetBlockTime * BigInt(1000); // FIXME: initial block time
            if (blocktime == BigInt(0)) {
                blocktime = BigInt(1) * FixedPoint.UNIT
                // console.log('Verifying block with blockTime (secs) = ', Number(blocktime) / Number(FixedPoint.UNIT) )
            }
                
            const comp = BlockOp.initializeComptroller(prevOp);

            
            // millisecs to secs for blocktime
            comp.addBlockSample(blocktime / BigInt(1000), steps);

            this.blockNumber = new HashedBigInt(comp.getBlockNumber());
            this.movingMaxSpeed = new HashedBigInt(comp.getMovingMaxSpeed());
            this.movingMinSpeed = new HashedBigInt(comp.getMovingMinSpeed());
            this.blockTimeFactor = new HashedBigInt(comp.getBlockTimeFactor());

            if (vdfBootstrapResult) {
                this.vdfBootstrapResult = vdfBootstrapResult;
            }

            if (transactions !== undefined) {
                this.transactions = transactions;
            } else {
                this.transactions = [];
            }

            if (this.transactions.length > MAX_TX_PER_BLOCK) {
                throw new Error('The max number of transactions per block is ' + MAX_TX_PER_BLOCK + ', attempted to create a block with ' + this.transactions.length + '.');
            }

            this.blockReward = new HashedBigInt(comp.getConsensusBlockReward());
        }

    }

    getClassName(): string {
        return BlockOp.className;
    }

    init(): void {
        
    }

    getPrevBlockHash(): Hash | undefined {
        if (this.prevOps?.size() === 1) {
            return this.prevOps.values().next().value.hash;
        } else {
            return undefined;
        }
    }

    async validate(references: Map<Hash, HashedObject>): Promise<boolean> {

        references;

        if (this.blockNumber === undefined || this.vdfResult === undefined || this.vdfBootstrapResult === undefined) {
            BlockOp.logger.warning('Object is incomplete.');
            BlockOp.logger.debug('this.blockNumber: ', this.blockNumber);
            BlockOp.logger.debug('this.vdfResult:', this.vdfResult);
            BlockOp.logger.debug('this.vdfBootstrapResult', this.vdfBootstrapResult);
            return false;
        }

        if (this.blockNumber.getValue() <= BigInt(0)) {
            BlockOp.logger.warning('Sequence number is not positive.');
            return false;
        }
        
        if (this.timestampMillisecs === undefined) {
            BlockOp.logger.warning('Missing timestamp');
            return false;
        }

        if (!super.validate(references)) {
            BlockOp.logger.warning('Generic op validation failed.');
            return false;
        }

        if (! (this.getTargetObject() instanceof Blockchain)) {
            BlockOp.logger.warning('Target is nt a Blockchain instance.');
            return false;
        }

        if (this.getAuthor() === undefined) {
            BlockOp.logger.warning('Author is not undefined as it should be.');
            return false;
        }

        if (this.prevOps === undefined) {
            BlockOp.logger.warning('PrevOps is missing (it should be empty or a singleton - not missing).');
            return false;
        }

        let prev: HashedObject | undefined = undefined;
        
        if (this.blockNumber.getValue() === BigInt(1)) {
            if (this.prevOps.size() !== 0) {
                BlockOp.logger.warning('First block has predecessors.');
                return false;
            }

            if (this.vrfSeed !== undefined) {
                BlockOp.logger.warning('First block has a seedVdf but it should not.');
                return false;
            }
        } else {
            if (this.prevOps.size() !== 1) {
                BlockOp.logger.warning('Missing reference to previous block.');
                BlockOp.logger.debug('prevOps size:', this.prevOps.size());
                BlockOp.logger.debug('blockNumber:', this.blockNumber.getValue());
                return false;
            }
            
            if (this.vrfSeed === undefined) {
                BlockOp.logger.warning('Missing vrfSeed.');
                return false;
            }
        }

        let prevOpHash: Hash | undefined;

        if (this.prevOps.size() > 0) {

            prevOpHash = this.prevOps.values().next().value.hash;

            if (prevOpHash === undefined) {
                throw new Error('Prvious block was missing from references.');
            }

            prev = references.get(prevOpHash as string);

            if (!(prev instanceof BlockOp)) {
                BlockOp.logger.warning('prevOp is not an instance of BlockOp.');
                return false;
            }

            if (!prev.getTargetObject().equals(this.getTargetObject())) {
                BlockOp.logger.warning('The prevOp and this op targets differ.');
                return false;
            }
        }

        const prevOp: BlockOp | undefined = prev;

        if (this.vrfSeed !== undefined) {
            if (!(await BlockOp.validateVrfSeed(prevOpHash as Hash, this.vrfSeed, this.getAuthor() as Identity))) {
                BlockOp.logger.warning('Failed to validate VRF seed ' + this.vrfSeed + ' using prevOpHash ' + prevOpHash);
                return false;
            }
        }
         
        if (prevOp !== undefined) {
            if (this.timestampMillisecs?.getValue() <= (prevOp.timestampMillisecs?.getValue() as bigint)) { // timestamp always goes forward.
                BlockOp.logger.warning('next block timestamp is older or same as last block ' + this.timestampMillisecs?.getValue().toString() + ' using prevOp.timestampSeconds ' + prevOp.timestampMillisecs?.getValue().toString());
                return false;
            }
            // Tolerate only one target blocktime from the future (are millisecs plus 12 decimals with 0s).
            const localTimeBigInt = BigInt(Math.floor(Date.now() * 10**3)) * BigInt(10)**BigInt(FixedPoint.DECIMALS);
            if (this.timestampMillisecs?.getValue() > localTimeBigInt + MiniComptroller.targetBlockTime) {
                BlockOp.logger.warning('next block timestamp comes too much from the future ' + this.timestampMillisecs?.getValue().toString() + ' using localtimeBigInt ' + localTimeBigInt.toString());
                return false;
            }
        }

        let blocktime = prevOp !== undefined? 
                            this.timestampMillisecs?.getValue() - (prevOp.timestampMillisecs?.getValue() as bigint)
                        :
                            MiniComptroller.targetBlockTime * BigInt(1000); // FIXME:pwd initial block time
        
        if (blocktime == BigInt(0)) {
            blocktime = BigInt(1) * FixedPoint.UNIT
        }
                        
        const comp = BlockOp.initializeComptroller(prev);

        const challenge = await BlockOp.getChallenge((this.getTargetObject() as Blockchain), this.vrfSeed);
        // TODO: also use miner stake as a parameter.
        const steps = BlockOp.getVDFSteps(comp, challenge);
        // TODO: after computing VDF Steps, final challenge must be hashed with the Merkle Root of TXs.

        if (this.vdfSteps?._value !== steps) {
            BlockOp.logger.warning('VDF Steps are wrong, should be ' + steps.toString() + ' but received ' + this.vdfSteps?._value?.toString());
            return false;
        }

        // millisecs to secs for blocktime
        comp.addBlockSample(blocktime / BigInt(1000), steps);

        if (this.blockNumber?.getValue() !== comp.getBlockNumber()) {
            BlockOp.logger.warning('Comptroller rejected blockNumber');
            return false;
        }

        if (this.movingMaxSpeed?.getValue() !== comp.getMovingMaxSpeed()) {
            BlockOp.logger.warning('Comptroller rejected movingMaxSpeed');
            return false;
        }
                                                         
        if (this.movingMinSpeed?.getValue() !== comp.getMovingMinSpeed()) {
            BlockOp.logger.warning('Comptroller rejected movingMinSpeed');
            return false;
        }
                                                         
        if (this.blockTimeFactor?.getValue() !== comp.getBlockTimeFactor()) {
            BlockOp.logger.warning('Comptroller rejected blockTimeFactor');
            return false;
        }
                
        if (this.vdfBootstrapResult.toLowerCase() !== this.vdfBootstrapResult) {
            BlockOp.logger.warning('VDF bootstrap result is not lowercase');
            return false;
        }

        if ((this.vdfBootstrapResult !== undefined) !== comp.isBootstrapPeriod()) {
            BlockOp.logger.warning('VDF bootstrap result is only empty when bootstrap period ended.');
            return false;
        }

        if (this.vdfBootstrapResult !== undefined) {
            const bootstrapSteps = comp.getConsensusBootstrapDifficulty();
            if (!VDF.verify(challenge, bootstrapSteps, this.vdfBootstrapResult)) {
                BlockOp.logger.warning('Failed bootstrap VDF verification');
                return false;
            }
            if (!VDF.verify(this.vdfBootstrapResult, steps, this.vdfResult)) {
                BlockOp.logger.warning('Failed VDF verification (using bootstrap period result as challenge)');
                return false;
            }
        } else {
            if (!VDF.verify(challenge, steps, this.vdfResult)) {
                BlockOp.logger.warning('Failed VDF verification');
                return false;
            }
        }

        // now the real action

        if (this.blockReward === undefined) {
            BlockOp.logger.warning('Missing block reward');
            return false;
        }

        if (this.blockReward?.getValue() !== comp.getConsensusBlockReward()) {
            BlockOp.logger.warning('Wrong block reward');
            return false;
        }

        

        /*const ledger = await this.getLedgerForBlock(this.getPrevBlockHash(), references);
        if (!ledger.canProcessBlock(this)) {
            BlockOp.logger.warning('Invalid transactions');
            return false;
        }*/

        

        BlockOp.logger.info('Received #' + this.blockNumber.getValue().toString() + ' with steps=' + this.vdfSteps.getValue().toString() + ' and timestamp=' + new Date(Number(this.timestampMillisecs?.getValue())/10**(FixedPoint.DECIMALS)).toLocaleString() + ' by ' + this.getAuthor()?.hash() + ', block time ' + (Number(blocktime)/(10**(FixedPoint.DECIMALS+3))).toFixed(4).toString() + 's, block hash ends in ' + this.hash().slice(-6));
        BlockOp.logger.info('Tokenomics: movingMaxSpeed=' 
            + (Number(this.movingMaxSpeed?.getValue()) / 10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
            + ', movingMinSpeed=' + (Number(this.movingMinSpeed?.getValue())/10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
            + ', blockTimeFactor=' + (Number(this.blockTimeFactor?.getValue())/10**FixedPoint.DECIMALS)?.toFixed(4)?.toString() 
            + ', speedRatio=' + (Number(FixedPoint.divTrunc(this.movingMaxSpeed?.getValue(), this.movingMinSpeed.getValue())) / 10**FixedPoint.DECIMALS)?.toFixed(4)?.toString()
            + ', speed=' + (Number(comp.getSpeed()) / 10**FixedPoint.DECIMALS)?.toFixed(4)?.toString()
            );

        return true

    }

    /*private async getLedgerForBlock(blockHash?: Hash, references?: Map<Hash, HashedObject>): Promise<Ledger> {
        const blockList = new Array<BlockOp>();

        while (blockHash !== undefined) {
            let blockOp = references?.get(blockHash);

            if (blockOp === undefined) {
                blockOp = await this.getStore().load(blockHash);
            }
            
            if (blockOp === undefined) {
                throw new Error('Cannot create ledger to validate blockOp ' + this.hash() + ' because the chain is incompete: ')
            }

            if (!(blockOp instanceof BlockOp)) {
                throw new Error('Cannot create ledger to validate blockOp ' + this.hash() + ' because a previouse block has the wrong type: ' + blockHash);
            }

            blockList.push(blockOp);

            blockHash = blockOp.getPrevBlockHash();
        }

        const ledger = new Ledger();

        for (let i=blockList.length-1; i>=0; i--) {
            ledger.processBlock(blockList[i]);
        }

        return ledger;
    }*/

    static getChallenge(target: Blockchain, vrfSeed?: Hash): string {
        let challenge: string;

        if (vrfSeed === undefined) {
            challenge = target.getInitialChallenge();
        } else {
            challenge = Hashing.sha.sha256hex(vrfSeed);
        }

        return challenge + challenge + challenge + challenge;
    }

    // This is the pseudo-random toss of dice to determine what is going to be the slot of the miner
    // in the current block (according also to his stake). Also determines the input of the VDF mining.
    static async computeVrfSeed(coinbase: Identity, prevBlockHash?: Hash): Promise<{coinbase: Identity, prevBlockHash?: Hash, vrfSeed?: string}> {
        if (prevBlockHash !== undefined) {
            // The signature scheme HHS uses has a fixed padding, then signatures are unique and not malleable.
            return {coinbase: coinbase, prevBlockHash: prevBlockHash, vrfSeed: await coinbase.sign(prevBlockHash)};
        } else {
            return {coinbase: coinbase, prevBlockHash: prevBlockHash, vrfSeed: undefined};
        }
    }
        

    static async validateVrfSeed(prevOpHash: Hash, vrfSeed: string, author: Identity): Promise<boolean> {
        return author.verifySignature(prevOpHash, vrfSeed);
    }

    // TODO: also use miner stake as a parameter.
    static getVDFSteps(comp: MiniComptroller, challenge: string) {
        const seedVRF = BigInt( '0x'+challenge )
        const steps = comp.getConsensusDifficulty(
                                            BlockOp.coins,
                                            BlockOp.totalCoins,
                                            seedVRF,
                                        );
        return steps;
    }

    getSpeedRatio() {
        return FixedPoint.divTrunc(this.movingMaxSpeed?.getValue() as bigint, this.movingMinSpeed?.getValue() as bigint)
    }

    getFinalityDepth(): number {
        return Number(FixedPoint.trunc(this.getSpeedRatio()) + BigInt(1))
    }

    static initializeComptroller(prevOp?: BlockOp): MiniComptroller {
        const comptroller = new MiniComptroller();

        if (prevOp !== undefined) {
            comptroller.setBlockNumber(prevOp.blockNumber?.getValue() as bigint);
            comptroller.setMovingMaxSpeed(prevOp.movingMaxSpeed?.getValue() as bigint);
            comptroller.setMovingMinSpeed(prevOp.movingMinSpeed?.getValue() as bigint);
            comptroller.setBlockTimeFactor(prevOp.blockTimeFactor?.getValue() as bigint);
            comptroller.setSpeedRatio(FixedPoint.divTrunc(comptroller.getMovingMaxSpeed(), comptroller.getMovingMinSpeed()));
        } else {
            comptroller.setBlockTimeFactor(BigInt(120) * FixedPoint.UNIT)
            comptroller.setMovingMaxSpeed(BigInt(60) * FixedPoint.UNIT); 
            comptroller.setMovingMinSpeed(BigInt(20) * FixedPoint.UNIT); 
            comptroller.setSpeedRatio(FixedPoint.divTrunc(comptroller.getMovingMaxSpeed(), comptroller.getMovingMinSpeed()));
        }

        comptroller.setMaxSpeedRatio(BigInt(4) * FixedPoint.UNIT);

        return comptroller;

    }

    getHeaderProps(prevOpCausalHistories: Map<Hash, OpHeader>): OpHeaderProps {
        
        const prevOpHash = this.getPrevBlockHash();

        let currentDiff = this.vdfSteps?.getValue() as bigint;

        if (prevOpHash !== undefined) {
            const prevOpHistory = (prevOpCausalHistories.get(prevOpHash) as OpHeader);

            const prevTotalDifficulty = BigInt('0x' + prevOpHistory.headerProps.get('totalDifficulty'));

            currentDiff = currentDiff + prevTotalDifficulty;
        }

        const props = new Map();

        props.set('totalDifficulty', currentDiff.toString(16));

        return props;
    }

}

HashedObject.registerClass(BlockOp.className, BlockOp);

export { BlockOp };
