
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

    constructor(target?: Blockchain, prevOp?: BlockchainValueOp, steps?: bigint, vdfResult?: string, vdfBoostrapResult?: string, coinbase?: Identity, vrfSeed?: string) {
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
            console.log('Verifying block with blockTime (secs) = ', Number(blocktime) / Number(FixedPoint.UNIT) )
            
            const comp = BlockchainValueOp.initializeComptroller(prevOp);

            

            comp.addBlockSample(blocktime, steps);

            this.blockNumber = new HashedBigInt(comp.getBlockNumber());
            this.movingMaxSpeed = new HashedBigInt(comp.getMovingMaxSpeed());
            this.movingMinSpeed = new HashedBigInt(comp.getMovingMinSpeed());
            this.blockTimeFactor = new HashedBigInt(comp.getBlockTimeFactor());

            if (vdfBoostrapResult) {
                this.vdfBootstrapResult = vdfBoostrapResult;
            }

            console.log('prevOps in block ' + this.blockNumber.getValue() + ':');
            console.log(this.prevOps?.size());
        }

    }

    getClassName(): string {
        return BlockchainValueOp.className;
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
            console.log();
            console.log('Object is incomplete.');
            console.log(this.blockNumber);
            console.log(this.vdfResult);
            console.log(this.vdfBootstrapResult);
            console.log();
            return false;
        }

        if (this.blockNumber.getValue() <= BigInt(0)) {
            console.log('Sequence number is not positive.');
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

        if (this.getAuthor() === undefined) {
            console.log('Author is not undefined as it should be.');
            return false;
        }

        if (this.prevOps === undefined) {
            console.log('PrevOps is missing (it should be empty or a singleton - not missing).');
            return false;
        }

        let prev: HashedObject | undefined = undefined;
        
        if (this.blockNumber.getValue() === BigInt(1)) {
            if (this.prevOps.size() !== 0) {
                console.log('First block as predecessors.');
                return false;
            }

            if (this.vrfSeed !== undefined) {
                console.log('First block has a seedVdf but it should not.');
                return false;
            }
        } else {
            if (this.prevOps.size() !== 1) {
                console.log('Missing reference to previous block.');
                console.log(this.prevOps.size());
                console.log(this.blockNumber.getValue());
                return false;
            }
            
            if (this.vrfSeed === undefined) {
                console.log('Missing vrfSeed.');
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

        if (this.vrfSeed !== undefined) {
            BlockchainValueOp.validateVrfSeed(prevOpHash as Hash, this.vrfSeed, this.getAuthor() as Identity);
        }
            
        let blocktime = prevOp !== undefined? 
                            BigInt(Math.floor(this.timestampSeconds - (prevOp.timestampSeconds as number))) * (FixedPoint.UNIT / (BigInt(10)**BigInt(3)))
                        :
                            MiniComptroller.targetBlockTime; // FIXME: initial block time
        
        if (blocktime == BigInt(0)) {
            blocktime = BigInt(1) * FixedPoint.UNIT
        }
                        
        const comp = BlockchainValueOp.initializeComptroller(prev);

        const challenge = await BlockchainValueOp.getChallenge((this.getTarget() as Blockchain), this.vrfSeed);
        const steps = BlockchainValueOp.getVDFSteps(comp, challenge);

        if (this.vdfSteps?._value !== steps) {
            console.log('VDF Steps are wrong, should be ' + steps + ' but received ' + this.vdfSteps?._value);
        }

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
            const bootstrapSteps = comp.getConsensusBootstrapDifficulty();
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
        // TODO: warning! using the challenge as temporary VRF seed. Replace this with VRF seed hashed with prev hash block!
        const seedVRF = BigInt( '0x'+challenge ) // TODO: warning! replace with VRF seed + hashing with prev block hash.
        const steps = comp.getConsensusDifficulty(
                                            BlockchainValueOp.coins,
                                            BlockchainValueOp.totalCoins,
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

    static async shouldAcceptNewHead(newHead: BlockchainValueOp, oldHead: BlockchainValueOp, store: Store): Promise<boolean> {
        
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
        
        if (heightDifference > longestChainFinalityDepth || (newHeight <= longestChainFinalityDepth && oldHeight <= longestChainFinalityDepth)) {
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
                    currentNewBlock = await store.load(prevHashA) as BlockchainValueOp;
                }
            } else if (currentNewBlockHeight < currentOldBlockHeight) {
                const prevHashB = currentOldBlock.getPrevBlockHash();
                if (prevHashB !== undefined) {
                    currentOldBlock = await store.load(prevHashB) as BlockchainValueOp;
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
                        currentNewBlock = await store.load(newBlockPrevHash) as BlockchainValueOp;
                    } else {
                        throw new Error('The forked chain and the old one have different origin blocks, this should be impossible');
                    }
                    const oldBlockPrevHash = currentOldBlock.getPrevBlockHash();
                    if (oldBlockPrevHash !== undefined) {
                        currentOldBlock = await store.load(oldBlockPrevHash) as BlockchainValueOp;
                    } else {
                        throw new Error('The forked chain and the old one have different origin blocks, this should be impossible');
                    }
                }
            }
        }


        if (newHeight === oldHeight) {
            const newTotalDifficulty = BigInt('0x' +(await store.loadOpCausalHistory(newHead.hash()))?.opProps.get('totalDifficulty'));
            const oldTotalDifficulty = BigInt('0x' +(await store.loadOpCausalHistory(oldHead.hash()))?.opProps.get('totalDifficulty'));


            if (newTotalDifficulty === oldTotalDifficulty) {
                return newHead.getLastHash().localeCompare(oldHead.getLastHash()) < 0;
            } else {
                return newTotalDifficulty < oldTotalDifficulty;
            }
        } else {
            return newHeight > oldHeight;
        }

        
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
            comptroller.setBlockTimeFactor(BigInt(500) * FixedPoint.UNIT)
            comptroller.setMovingMaxSpeed(BigInt(3) * FixedPoint.UNIT);
            comptroller.setMovingMinSpeed(BigInt(1) * FixedPoint.UNIT);
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

HashedObject.registerClass(BlockchainValueOp.className, BlockchainValueOp);

export { BlockchainValueOp as BlockchainValueOp };