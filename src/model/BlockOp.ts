
//import {createHash} from "crypto";
import { Hash, HashedObject, Hashing, Identity, MutationOp, Store } from '@hyper-hyper-space/core';
import { HashedBigInt } from './HashedBigInt';
//import { Logger, LogLevel } from '@hyper-hyper-space/core';

import { Blockchain } from './Blockchain';
import { MiniComptroller, FixedPoint } from './MiniComptroller';
//import { VDF } from './VDF';

//import {SlothPermutation} from '@hyper-hyper-space/sloth-permutation';
import {SlothPermutation} from './SlothVDF';
import { VDF } from './VDF';
import { OpCausalHistory, OpCausalHistoryProps } from '@hyper-hyper-space/core/dist/data/history/OpCausalHistory';
import { Logger, LogLevel } from '../../../core/dist/util/logging';
(global as any).document = { }; // yikes!

class BlockOp extends MutationOp {

    static logger = new Logger(BlockOp.name, LogLevel.INFO)

    static className = 'hhs/v0/soliton/BlockchainValueOp';

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

    timestampSeconds?: number;

    constructor(target?: Blockchain, prevOp?: BlockOp, steps?: bigint, vdfResult?: string, vdfBootstrapResult?: string, coinbase?: Identity, vrfSeed?: string) {
        super(target);

        if (target !== undefined && vdfResult !== undefined && steps !== undefined && coinbase !== undefined) {

            this.setAuthor(coinbase);

            if (prevOp !== undefined) {
                this.setPrevOps([prevOp].values());
            }

            vdfResult = vdfResult.toLowerCase();

            this.vrfSeed = vrfSeed;

            this.timestampSeconds = Date.now();

            this.vdfSteps  = new HashedBigInt(steps);
            this.vdfResult = vdfResult;

            let blocktime = prevOp !== undefined? 
                                BigInt(Math.floor(this.timestampSeconds - (prevOp.timestampSeconds as number))) * (FixedPoint.UNIT / (BigInt(10)**BigInt(3)))
                            :
                                MiniComptroller.targetBlockTime; // FIXME: initial block time
            if (blocktime == BigInt(0))
                blocktime = BigInt(1) * FixedPoint.UNIT
           // console.log('Verifying block with blockTime (secs) = ', Number(blocktime) / Number(FixedPoint.UNIT) )
            
            const comp = BlockOp.initializeComptroller(prevOp);

            

            comp.addBlockSample(blocktime, steps);

            this.blockNumber = new HashedBigInt(comp.getBlockNumber());
            this.movingMaxSpeed = new HashedBigInt(comp.getMovingMaxSpeed());
            this.movingMinSpeed = new HashedBigInt(comp.getMovingMinSpeed());
            this.blockTimeFactor = new HashedBigInt(comp.getBlockTimeFactor());

            if (vdfBootstrapResult) {
                this.vdfBootstrapResult = vdfBootstrapResult;
            }
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

        // TODO: verify this timestamp does NOT come N seconds from the future (example: N = 15 secs)
        if (this.timestampSeconds === undefined) {
            BlockOp.logger.warning('Missing timestamp');
            return false;
        }

        if (!super.validate(references)) {
            BlockOp.logger.warning('Generic op validation failed.');
            return false;
        }

        if (! (this.getTarget() instanceof Blockchain)) {
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

            if (!prev.getTarget().equals(this.getTarget())) {
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
            
        let blocktime = prevOp !== undefined? 
                            BigInt(Math.floor(this.timestampSeconds - (prevOp.timestampSeconds as number))) * (FixedPoint.UNIT / (BigInt(10)**BigInt(3)))
                        :
                            MiniComptroller.targetBlockTime; // FIXME: initial block time
        
        if (blocktime == BigInt(0)) {
            blocktime = BigInt(1) * FixedPoint.UNIT
        }
                        
        const comp = BlockOp.initializeComptroller(prev);

        const challenge = await BlockOp.getChallenge((this.getTarget() as Blockchain), this.vrfSeed);
        const steps = BlockOp.getVDFSteps(comp, challenge);
        // TODO: after computing VDF Steps, final challenge must be hashed with the Merkle Root of TXs.

        if (this.vdfSteps?._value !== steps) {
            BlockOp.logger.warning('VDF Steps are wrong, should be ' + steps + ' but received ' + this.vdfSteps?._value);
            return false;
        }

        comp.addBlockSample(blocktime, steps);

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

        BlockOp.logger.info('Received #' + this.blockNumber.getValue() + ' with steps=' + this.vdfSteps.getValue() + ' and timestamp=' + new Date(this.timestampSeconds).toLocaleString() + ' by ' + this.getAuthor()?.hash() + '.');
        
        return true

    }

    static getChallenge(target: Blockchain, vrfSeed?: Hash): string {
        let challenge: string;

        if (vrfSeed === undefined) {
            challenge = target.getInitialChallenge();
        } else {
            challenge = Hashing.sha.sha256hex(vrfSeed);
        }

        return challenge + challenge + challenge + challenge;
    }

    static async computeVrfSeed(author: Identity, prevOpHash?: Hash): Promise<string | undefined> {
        if (prevOpHash !== undefined) {
            // TODO: for entropy hardening, do another hash of the result of sign().
            return author.sign(prevOpHash);
        } else {
            return undefined;
        }
    }
        

    static async validateVrfSeed(prevOpHash: Hash, vrfSeed: string, author: Identity): Promise<boolean> {
        return author.verifySignature(prevOpHash, vrfSeed);
    }

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

    // Caveat: oldHead sometimes may be the block we are currently mining, and therefore
    //         it does not exist in the store (or its causal history).

    static async shouldAcceptNewHead(newHead: BlockOp, oldHead: BlockOp, store: Store): Promise<boolean> {
        
        if (newHead.equals(oldHead)) {
            return false;
        }

        let longestChainFinalityDepth = 0;

        const newHeight = (newHead.blockNumber as HashedBigInt).getValue();
        const oldHeight = (oldHead.blockNumber as HashedBigInt).getValue();

        if (oldHeight === newHeight) {
            const oldFinality = oldHead.getFinalityDepth();
            const newFinality = newHead.getFinalityDepth();

            if (oldFinality > newFinality) {
                longestChainFinalityDepth = oldFinality;
            } else {
                longestChainFinalityDepth = newFinality;
            }
        } else if (oldHeight > newHeight) {
            longestChainFinalityDepth = oldHead.getFinalityDepth();
        } else {
            longestChainFinalityDepth = newHead.getFinalityDepth()
        }


        let heightDifference = newHeight - oldHeight;
        if (heightDifference < BigInt(0)) {
            heightDifference = -heightDifference;
        }
        
        
        if (heightDifference > longestChainFinalityDepth) {
            return newHeight > oldHeight;
        }

        let currentNewBlock = newHead;
        let currentOldBlock = oldHead;
        
        for (let d = 0; d < longestChainFinalityDepth; d++) {

            if (currentNewBlock.equals(oldHead)) {
                return true;
            }

            const currentNewBlockHeight = (currentNewBlock.blockNumber as HashedBigInt).getValue();
            const currentOldBlockHeight = (currentOldBlock.blockNumber as HashedBigInt).getValue();

            if (currentNewBlockHeight > currentOldBlockHeight) {
                const prevHashA = currentNewBlock.getPrevBlockHash();
                if (prevHashA !== undefined) {
                    currentNewBlock = await store.load(prevHashA) as BlockOp;
                }
            } else if (currentNewBlockHeight < currentOldBlockHeight) {
                const prevHashB = currentOldBlock.getPrevBlockHash();
                if (prevHashB !== undefined) {
                    currentOldBlock = await store.load(prevHashB) as BlockOp;
                }
            } else { // same len

                if (currentNewBlock.getPrevBlockHash() === currentOldBlock.getPrevBlockHash()) {
                    const newLocalDifficulty = currentNewBlock.vdfSteps?.getValue() as bigint; 
                    const oldLocalDifficulty = currentOldBlock.vdfSteps?.getValue() as bigint;

                    if (newLocalDifficulty === oldLocalDifficulty) {
                        return currentNewBlock.hash().localeCompare(currentOldBlock.hash()) < 0;
                    } else {
                        return newLocalDifficulty < oldLocalDifficulty;
                    }
                } else { 
                    const newBlockPrevHash = currentNewBlock.getPrevBlockHash();
                    if (newBlockPrevHash !== undefined) {
                        currentNewBlock = await store.load(newBlockPrevHash) as BlockOp;
                    } else {
                        throw new Error('The forked chain and the old one have different origin blocks, this should be impossible');
                    }
                    const oldBlockPrevHash = currentOldBlock.getPrevBlockHash();
                    if (oldBlockPrevHash !== undefined) {
                        currentOldBlock = await store.load(oldBlockPrevHash) as BlockOp;
                    } else {
                        throw new Error('The forked chain and the old one have different origin blocks, this should be impossible');
                    }
                }
            }
        }


        if (newHeight === oldHeight) {
            const newTotalDifficulty = BigInt('0x' +(await store.loadOpCausalHistory(newHead.hash()))?.opProps.get('totalDifficulty'));
            
            // See note above (Caveat...): oldHead may not exist in the store (if it is the block being currenty mined)
            
            const oldHeadHistory = await store.loadOpCausalHistory(oldHead.hash());
            const prevBlockHash  = oldHead.getPrevBlockHash();

            
            const oldTotalDifficulty = oldHeadHistory !== undefined?
                                            BigInt('0x' + oldHeadHistory.opProps.get('totalDifficulty'))
                                        :
                                            
                                            (
                                                (oldHead.vdfSteps as HashedBigInt).getValue()
                                                    +
                                                (prevBlockHash === undefined?
                                                        BigInt(0) 
                                                    :
                                                        BigInt('0x' + (await store.loadOpCausalHistory(prevBlockHash))?.opProps.get('totalDifficulty'))
                                                )
                                            );


            if (newTotalDifficulty === oldTotalDifficulty) {
                return newHead.getLastHash().localeCompare(oldHead.getLastHash()) < 0;
            } else {
                return newTotalDifficulty < oldTotalDifficulty;
            }
        } else {
            return newHeight > oldHeight;
        }

        
    }

    static shouldInterruptCurrentMining(miningPrevBlock: BlockOp|undefined, target: Blockchain, currentDifficulty: bigint, coinbase: Identity, newHead: BlockOp, store: Store) { 

        let miningBlock = new BlockOp(target, miningPrevBlock, currentDifficulty, '', '', coinbase, '')

        return BlockOp.shouldAcceptNewHead(newHead, miningBlock, store)

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
            comptroller.setBlockTimeFactor(BigInt(100) * FixedPoint.UNIT)
            comptroller.setMovingMaxSpeed(BigInt(50) * FixedPoint.UNIT);
            comptroller.setMovingMinSpeed(BigInt(25) * FixedPoint.UNIT);
            comptroller.setSpeedRatio(FixedPoint.divTrunc(comptroller.getMovingMaxSpeed(), comptroller.getMovingMinSpeed()));
        }

        comptroller.setMaxSpeedRatio(BigInt(4) * FixedPoint.UNIT);

        return comptroller;

    }

    getCausalHistoryProps(prevOpCausalHistories: Map<Hash, OpCausalHistory>): OpCausalHistoryProps {
        
        const prevOpHash = this.getPrevBlockHash();

        let currentDiff = this.vdfSteps?.getValue() as bigint;

        if (prevOpHash !== undefined) {
            const prevOpHistory = (prevOpCausalHistories.get(prevOpHash) as OpCausalHistory);

            const prevTotalDifficulty = BigInt('0x' + prevOpHistory.opProps.get('totalDifficulty'));

            currentDiff = currentDiff + prevTotalDifficulty;
        }

        const props = new Map();

        props.set('totalDifficulty', currentDiff.toString(16));

        return props;
    }

}

HashedObject.registerClass(BlockOp.className, BlockOp);

export { BlockOp };