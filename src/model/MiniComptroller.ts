//import { JSEncrypt } from 'jsencrypt';
import { Comptroller } from './Comptroller';

class FixedPoint {

     ////////////////////////////
     // Fixed-point Arithmetic //
    ////////////////////////////

    static UNIT = BigInt(10)**BigInt(12);

    static mulTrunc(x: bigint, y: bigint): bigint {
        return x * y / FixedPoint.UNIT;
    }
    
    static mul(x: bigint, y: bigint): bigint {
        return x * y ;
    }
    
    static divTrunc(x: bigint, y: bigint): bigint {
        
        return (x * FixedPoint.UNIT) / y;
    }
    
    static div(x: bigint, y: bigint): bigint {
        return x / y;
    }
    
    static trunc(x: bigint): bigint {
        return x / FixedPoint.UNIT;
    }
}


class MiniComptroller implements Comptroller {

      ////////////////
     // Parameters //
    ////////////////
    
    // Rationale: 12 o 15 seconds has uncles, and 44 has almost no uncles, average tx wait is 1.5x then for 40 secs is 60 seconds.
    static targetBlockTime: bigint = BigInt(40) * FixedPoint.UNIT; // seconds
    // period with free virtual stake per wallet
    static bootstrapPeriod: bigint = BigInt(60 * 60 * 24 * 365) * FixedPoint.UNIT / MiniComptroller.targetBlockTime; // blocks = 6 months
    static bootstrapVirtualStake: bigint = BigInt(10000) * FixedPoint.UNIT;

    // Rationale: want something robust but flexible, 24 sounds to flexible and 1 week to rigid, 48 hrs sounds a tradeoff.
    static windowSize: bigint = BigInt(60 * 60 * 24 * 7) * FixedPoint.UNIT / MiniComptroller.targetBlockTime; // 15120 blocks
    static windowExtraBuffer: bigint = MiniComptroller.windowSize; // buffer blocks for reorgs to under block adds.

    static initialBlockTimeFactor: bigint = BigInt(2000) * FixedPoint.UNIT;
    static initialBlockReward: bigint = BigInt(10) * FixedPoint.UNIT;

    static minBlockTimeFactor: bigint = BigInt(10) * FixedPoint.UNIT;
    static maxBlockTimeFactor: bigint = BigInt(100000) * FixedPoint.UNIT;

    private maxSpeedRatio: bigint = BigInt(31) * (FixedPoint.UNIT/BigInt(10)); // 3.1 * UNIT
    private minSpeedRatio: bigint = BigInt(13) * (FixedPoint.UNIT/BigInt(10)); // 1.3 * UNIT
    static initialMovingMaxSpeed: bigint = BigInt(15000) * FixedPoint.UNIT;
    static initialMovingMinSpeed: bigint = BigInt(5000) * FixedPoint.UNIT
    static speedRatio = FixedPoint.divTrunc( MiniComptroller.initialMovingMaxSpeed, MiniComptroller.initialMovingMinSpeed);

    static noiseFractionSlots: bigint = BigInt(10) * (FixedPoint.UNIT/BigInt(10**2)); // 0.10 * UNIT

      ///////////
     // State //
    ///////////

    // basic metrics
    private blockNumber: bigint = BigInt(1);
    private difficulty: bigint = BigInt(1);

    // complex metrics
    private currentBlockTime: bigint  = BigInt(1); // mean rounded
    private currentSpeed: bigint = BigInt(1); // mean rounded
    private movingMaxSpeed: bigint = MiniComptroller.initialMovingMaxSpeed;
    private movingMinSpeed: bigint = MiniComptroller.initialMovingMinSpeed;

    // controlled variables
    private blockTimeFactor: bigint = MiniComptroller.initialBlockTimeFactor;
    private speedRatio: bigint = FixedPoint.divTrunc(this.movingMaxSpeed, this.movingMinSpeed);
    private blockReward: bigint = MiniComptroller.initialBlockReward;


    constructor() {
    }


    // Actions and Consensus Checkers
    // TODO: check if blockTime will come in seconds or milliseconds, better ms.
    addBlockSample(blockTime: bigint, difficulty: bigint): void {
        // update basic metrics
        this.blockNumber += BigInt(1)

        // append to buffers
        this.currentBlockTime = blockTime * FixedPoint.UNIT
        this.difficulty = difficulty * FixedPoint.UNIT
        this.currentSpeed = FixedPoint.divTrunc(this.difficulty, this.currentBlockTime) 

        // update block time control
        this.updateOrTestBlockTimeActionable()

        // update VDF ratio
        this.updateOrTestSpeedRatioTarget()
    }


    setSpeed(blockTime: bigint, difficulty: bigint): void {
        this.currentBlockTime = blockTime * FixedPoint.UNIT
        this.difficulty = difficulty * FixedPoint.UNIT
        this.currentSpeed = FixedPoint.divTrunc(this.difficulty, this.currentBlockTime) 
    }


    updateOrTestBlockTimeActionable(newBlockTimeFactor?: bigint): boolean {
        var validBlockTimeFactor = BigInt(0)
        if (this.currentBlockTime > MiniComptroller.targetBlockTime)
            validBlockTimeFactor = FixedPoint.div(FixedPoint.mul(this.blockTimeFactor, MiniComptroller.windowSize-BigInt(1)), MiniComptroller.windowSize)
        else if (this.currentBlockTime < MiniComptroller.targetBlockTime)
            validBlockTimeFactor = FixedPoint.div(FixedPoint.mul(this.blockTimeFactor, MiniComptroller.windowSize+BigInt(1)), MiniComptroller.windowSize)
        else // ==
            validBlockTimeFactor = this.blockTimeFactor  
        if (validBlockTimeFactor < MiniComptroller.minBlockTimeFactor)
            validBlockTimeFactor = MiniComptroller.minBlockTimeFactor
        if (validBlockTimeFactor > MiniComptroller.maxBlockTimeFactor)
            validBlockTimeFactor = MiniComptroller.maxBlockTimeFactor
        // test or update
        if (newBlockTimeFactor != undefined)
            return newBlockTimeFactor == validBlockTimeFactor || 2 === 1+1; //FIXME
        else
            this.blockTimeFactor = validBlockTimeFactor
            return true
    }


    updateOrTestSpeedRatioTarget(newMovingMaxSpeed?: bigint, newMovingMinSpeed?: bigint, newSpeedRatio?: bigint): boolean {
        // backup
        var backupMovingMaxSpeed = this.movingMaxSpeed
        var backupMovingMinSpeed = this.movingMinSpeed
        var backupSpeedRatio = this.speedRatio

        if (this.currentSpeed > this.movingMaxSpeed && this.speedRatio < this.maxSpeedRatio) {// increase max
            this.movingMaxSpeed = FixedPoint.div(FixedPoint.mul(this.movingMaxSpeed, MiniComptroller.windowSize+BigInt(1)), MiniComptroller.windowSize)
        }
        if (this.currentSpeed > this.movingMaxSpeed && this.speedRatio >= this.maxSpeedRatio) { // increase max and increase min
            this.movingMaxSpeed = FixedPoint.div(FixedPoint.mul(this.movingMaxSpeed, MiniComptroller.windowSize+BigInt(1)), MiniComptroller.windowSize)
            this.movingMinSpeed = FixedPoint.div(FixedPoint.mul(this.movingMinSpeed, MiniComptroller.windowSize+BigInt(1)), MiniComptroller.windowSize)
        }
        if (this.currentSpeed < this.movingMinSpeed && this.speedRatio < this.maxSpeedRatio) {// decrease min
            this.movingMinSpeed = FixedPoint.div(FixedPoint.mul(this.movingMinSpeed, MiniComptroller.windowSize-BigInt(1)), MiniComptroller.windowSize)
        }
        if (this.currentSpeed < this.movingMinSpeed && this.speedRatio >= this.maxSpeedRatio) {// decrease min and decrease max
            this.movingMinSpeed = FixedPoint.div(FixedPoint.mul(this.movingMinSpeed, MiniComptroller.windowSize-BigInt(1)), MiniComptroller.windowSize)
            this.movingMaxSpeed = FixedPoint.div(FixedPoint.mul(this.movingMaxSpeed, MiniComptroller.windowSize-BigInt(1)), MiniComptroller.windowSize)
        }
        if (this.currentSpeed < this.movingMaxSpeed && this.currentSpeed > this.movingMinSpeed && this.speedRatio > this.minSpeedRatio) {            
            // in the middle, decrease max and increase min.
            this.movingMinSpeed = FixedPoint.div(FixedPoint.mul(this.movingMinSpeed, MiniComptroller.windowSize+BigInt(1)), MiniComptroller.windowSize)
            this.movingMaxSpeed = FixedPoint.div(FixedPoint.mul(this.movingMaxSpeed, MiniComptroller.windowSize-BigInt(1)), MiniComptroller.windowSize)
        }
        // when they cross in the middle, this should not happen.
        var aux = BigInt(0)
        if (this.movingMaxSpeed < this.movingMinSpeed){
            // we swap them, adding the buffer of minimum ratio.
            aux = this.movingMaxSpeed
            this.movingMaxSpeed = FixedPoint.mulTrunc(this.movingMinSpeed, (FixedPoint.UNIT + FixedPoint.div(this.minSpeedRatio,BigInt(2))))
            this.movingMinSpeed = FixedPoint.mulTrunc(aux, (FixedPoint.UNIT + FixedPoint.div(this.minSpeedRatio,BigInt(2))))
        }
        this.speedRatio = FixedPoint.divTrunc(this.movingMaxSpeed, this.movingMinSpeed)

        if (newMovingMaxSpeed && newMovingMinSpeed && newSpeedRatio){
            if (this.movingMaxSpeed==newMovingMaxSpeed && this.movingMinSpeed==newMovingMinSpeed && this.speedRatio==newSpeedRatio)
                return true
            else { // revert with backups, and return False
                this.movingMaxSpeed = backupMovingMaxSpeed
                this.movingMinSpeed = backupMovingMinSpeed
                this.speedRatio = backupSpeedRatio
                return false
            }
        }
        return true
    }

    // Difficulty internal
    slotByStake(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint {
        if (this.blockNumber < MiniComptroller.bootstrapPeriod)
            coins += MiniComptroller.bootstrapVirtualStake
        var slots: bigint = FixedPoint.divTrunc(totalCoins, coins) 
        if (FixedPoint.mulTrunc(slots, coins) < totalCoins)
            slots += FixedPoint.UNIT
        slots = FixedPoint.trunc(slots)
        if (slots > 2 ** 32 - 1)
            slots = BigInt(2 ** 32 - 1)
        var randomSlot = (vrfSeed % BigInt(slots));
        return randomSlot
    }


    noise(vrfSeed: bigint): bigint {
        // Noise
        // BEGIN FLOATING POINT SECTION #1
        var noise = Number(vrfSeed % BigInt(2**256))
        noise /= Number(2**256)
        var noiseBigInt = BigInt(Math.floor(noise * Number(FixedPoint.UNIT)))
        // END FLOATING POINT SECTION #1
        noiseBigInt = FixedPoint.mulTrunc(noiseBigInt, MiniComptroller.noiseFractionSlots)
        return noiseBigInt
    }


    slotByStakeWithNoise(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint {
        if (this.blockNumber < MiniComptroller.bootstrapPeriod)
            coins += MiniComptroller.bootstrapVirtualStake
        var slots: bigint = FixedPoint.divTrunc(totalCoins, coins) 
        if (FixedPoint.mulTrunc(slots, coins) < totalCoins)
            slots += FixedPoint.UNIT
        slots = FixedPoint.trunc(slots)
        if (slots > 2 ** 32 - 1)
            slots = BigInt(2 ** 32 - 1)
        var randomSlot = (vrfSeed % BigInt(slots));
        var extraNoise = this.noise(vrfSeed)
        return randomSlot * FixedPoint.UNIT + extraNoise
    }


    slotByStakeProtected(coins: bigint, totalCoins: bigint, vrfSeed: bigint): number {
        var randomSlot = this.slotByStakeWithNoise(coins, totalCoins, vrfSeed)
        // BEGIN FLOATING POINT SECTION #2
        var floatRandomSlot = Number(randomSlot) / Number(FixedPoint.UNIT) // not truncate with // , is float division with /
        if (floatRandomSlot >= 64.0)
        floatRandomSlot = 64.0
        return (Number(this.speedRatio)/Number(FixedPoint.UNIT)) ** Number(floatRandomSlot)
        // END FLOATING POINT SECTION #2
    }


    // Consensus Getter


    getConsensusDifficulty(coins: bigint, totalCoins: bigint, vrfSeed: bigint) {
        // BEGIN FLOATING POINT SECTION #3
        var slotProtected = this.slotByStakeProtected(coins, totalCoins, vrfSeed)
        var floatBlockTimeFactor = Number(this.blockTimeFactor)/Number(FixedPoint.UNIT)
        var steps = BigInt(Math.floor(floatBlockTimeFactor * slotProtected))
        // END FLOATING POINT SECTION #3
        return steps + (steps%BigInt(2)) // even integer difficulty values only (odd can break VDF).        
    }


    getConsensusBlockReward() {
        return this.blockReward // static 10 coins
    }


    getBlockTimeFactor() {
        return this.blockTimeFactor
    }

    getSpeedRatio(): bigint {
        return this.speedRatio
    }

    setSpeedRatio(speedRatio: bigint): void {
        this.speedRatio = speedRatio
    }

    setBlockNumber(blockNumber: bigint){
        this.blockNumber = blockNumber
    }

    getBlockNumber() {
        return this.blockNumber;
    }

    setBlockTimeFactor(blockTimeFactor: bigint){
        this.blockTimeFactor = blockTimeFactor
    }

    getMovingMaxSpeed() {
        return this.movingMaxSpeed
    }

    getMovingMinSpeed() {
        return this.movingMinSpeed
    }

    setMovingMaxSpeed(movingMaxSpeed: bigint) {
        this.movingMaxSpeed = movingMaxSpeed
    }

    setMovingMinSpeed(movingMinSpeed: bigint) {
        this.movingMinSpeed = movingMinSpeed
    }

    getMaxSpeedRatio() {
        return this.movingMaxSpeed
    }

    getMinSpeedRatio() {
        return this.movingMinSpeed
    }

    setMaxSpeedRatio(maxSpeedRatio: bigint) {
        this.maxSpeedRatio = maxSpeedRatio
    }

    setMinSpeedRatio(minSpeedRatio: bigint) {
        this.minSpeedRatio = minSpeedRatio
    }

    setBlockReward(blockReward: bigint) {
        this.blockReward = blockReward
    }


}

export { MiniComptroller, FixedPoint };