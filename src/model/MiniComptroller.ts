//import { JSEncrypt } from 'jsencrypt';
import { Comptroller } from './Comptroller';

class FixedPoint {

     ////////////////////////////
     // Fixed-point Arithmetic //
    ////////////////////////////

    static DECIMALS = 12;
    static UNIT = BigInt(10)**BigInt(FixedPoint.DECIMALS);

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

    static toNumber(x: bigint): number {
        return Number(x) / Number(FixedPoint.UNIT)
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

    // Rationale: want something robust but flexible, 24 sounds to flexible and 1 week to rigid, 24 hrs sounds a tradeoff.
    static windowSize: bigint = BigInt(60 * 60 * 24 * 1 ) * FixedPoint.UNIT / MiniComptroller.targetBlockTime; // 2160 blocks
    static windowExtraBuffer: bigint = MiniComptroller.windowSize; // buffer blocks for reorgs to under block adds.

    static initialBlockTimeFactor: bigint = BigInt(2000) * FixedPoint.UNIT;
    static initialBlockReward: bigint = BigInt(10) * FixedPoint.UNIT;

    static minBlockTimeFactor: bigint = BigInt(1) * FixedPoint.UNIT;
    static maxBlockTimeFactor: bigint = BigInt(1000000000) * FixedPoint.UNIT;

    static staticMaxSpeedRatio: bigint = BigInt(31) * (FixedPoint.UNIT/BigInt(10)); // 3.1 * UNIT
    private maxSpeedRatio: bigint = MiniComptroller.staticMaxSpeedRatio    
    private minSpeedRatio: bigint = BigInt(13) * (FixedPoint.UNIT/BigInt(10)); // 1.3 * UNIT
    static initialMovingMaxSpeed: bigint = BigInt(15000) * FixedPoint.UNIT;
    static initialMovingMinSpeed: bigint = BigInt(5000) * FixedPoint.UNIT
    // VDF steps per seconds (Steps/Sec)
    static speedRatio = FixedPoint.divTrunc( MiniComptroller.initialMovingMaxSpeed, MiniComptroller.initialMovingMinSpeed);

    static noiseFractionSlots: bigint = BigInt(10) * (FixedPoint.UNIT/BigInt(10**2)); // 0.10 * UNIT

      ///////////
     // State //
    ///////////

    // basic metrics
    private blockNumber: bigint = BigInt(0);
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
        this.currentBlockTime = blockTime // * FixedPoint.UNIT
        this.difficulty = difficulty * FixedPoint.UNIT
        //console.log( 'this.difficulty', this.difficulty / FixedPoint.UNIT  )
        //console.log( 'this.currentBlockTime', this.currentBlockTime / FixedPoint.UNIT  )
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
            return newBlockTimeFactor == validBlockTimeFactor;
        else
            this.blockTimeFactor = validBlockTimeFactor
            return true
    }


    updateOrTestSpeedRatioTarget(newMovingMaxSpeed?: bigint, newMovingMinSpeed?: bigint, newSpeedRatio?: bigint): boolean {
        // backup
        var backupMovingMaxSpeed = this.movingMaxSpeed
        var backupMovingMinSpeed = this.movingMinSpeed
        var backupSpeedRatio = this.speedRatio

        //console.log('this.currentSpeed = ', Number(this.currentSpeed) / Number(FixedPoint.UNIT) )

        if (this.currentSpeed > this.movingMaxSpeed && this.speedRatio < this.maxSpeedRatio) {// increase max
            this.movingMaxSpeed = FixedPoint.div(FixedPoint.mul(this.movingMaxSpeed, MiniComptroller.windowSize+BigInt(1)), MiniComptroller.windowSize)
        } else
        if (this.currentSpeed > this.movingMaxSpeed && this.speedRatio >= this.maxSpeedRatio) { // increase max and increase min
            this.movingMaxSpeed = FixedPoint.div(FixedPoint.mul(this.movingMaxSpeed, MiniComptroller.windowSize+BigInt(1)), MiniComptroller.windowSize)
            this.movingMinSpeed = FixedPoint.div(FixedPoint.mul(this.movingMinSpeed, MiniComptroller.windowSize+BigInt(1)), MiniComptroller.windowSize)
        } else
        if (this.currentSpeed < this.movingMinSpeed && this.speedRatio < this.maxSpeedRatio) {// decrease min
            this.movingMinSpeed = FixedPoint.div(FixedPoint.mul(this.movingMinSpeed, MiniComptroller.windowSize-BigInt(1)), MiniComptroller.windowSize)
        } else
        if (this.currentSpeed < this.movingMinSpeed && this.speedRatio >= this.maxSpeedRatio) {// decrease min and decrease max
            this.movingMinSpeed = FixedPoint.div(FixedPoint.mul(this.movingMinSpeed, MiniComptroller.windowSize-BigInt(1)), MiniComptroller.windowSize)
            this.movingMaxSpeed = FixedPoint.div(FixedPoint.mul(this.movingMaxSpeed, MiniComptroller.windowSize-BigInt(1)), MiniComptroller.windowSize)
        } else
        if (this.currentSpeed < this.movingMaxSpeed && this.currentSpeed > this.movingMinSpeed && this.speedRatio > this.minSpeedRatio) {            
            // in the middle, decrease max and increase min.
            this.movingMinSpeed = FixedPoint.div(FixedPoint.mul(this.movingMinSpeed, MiniComptroller.windowSize+BigInt(1)), MiniComptroller.windowSize)
            this.movingMaxSpeed = FixedPoint.div(FixedPoint.mul(this.movingMaxSpeed, MiniComptroller.windowSize-BigInt(1)), MiniComptroller.windowSize)
        }
        // when they cross in the middle, this should not happen.
        if (this.movingMaxSpeed < this.movingMinSpeed){
            // we set them to mean speed.
            const meanSpeed = FixedPoint.div(this.movingMinSpeed + this.movingMaxSpeed, BigInt(2))
            this.movingMaxSpeed = meanSpeed 
            this.movingMinSpeed = meanSpeed
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


    // Consensus Getters

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

    isBootstrapPeriod(): boolean {
        return this.blockNumber < MiniComptroller.bootstrapPeriod 
    }

    getConsensusBootstrapDifficulty(): bigint {
        if (this.blockNumber >= MiniComptroller.bootstrapPeriod) // bootstrap period ended
            return BigInt(0)
        let meanBlockDifficulty = (this.movingMaxSpeed + this.movingMinSpeed) / BigInt(2) // middle point
        //console.log('movingMaxSpeed = ', this.movingMaxSpeed / FixedPoint.UNIT)
        //console.log('movingMinSpeed = ', this.movingMinSpeed / FixedPoint.UNIT)
        //console.log('meanSpeed = ', meanBlockDifficulty / FixedPoint.UNIT)
        
        // times blockTime seconds
        meanBlockDifficulty = FixedPoint.mulTrunc(meanBlockDifficulty, MiniComptroller.targetBlockTime) / FixedPoint.UNIT
        return meanBlockDifficulty / BigInt(2) // 50%
    }

    getConsensusFinalityDepth(): bigint {
        return FixedPoint.trunc( this.getSpeedRatio() ) + BigInt(1)
    }
    
    // Consensus Observers

    getBlockTimeFactor() {
        return this.blockTimeFactor
    }

    getSpeedRatio(): bigint {
        return this.speedRatio
    }

    getBlockNumber() {
        return this.blockNumber;
    }

    getMovingMaxSpeed() {
        return this.movingMaxSpeed
    }

    getMovingMinSpeed() {
        return this.movingMinSpeed
    }

    getMaxSpeedRatio() {
        return this.maxSpeedRatio
    }

    static getMaxSpeedRatioNumber(): number {
        return Number(FixedPoint.trunc(MiniComptroller.staticMaxSpeedRatio) + BigInt(1))
    }

    getMinSpeedRatio() {
        return this.minSpeedRatio
    }

    getSpeed() {
        return this.currentSpeed
    }

    getLastDifficulty() {
        return this.difficulty
    }

    getLastBlocktime() {
        return this.currentBlockTime
    }

    // Consensus Setters

    setSpeedRatio(speedRatio: bigint): void {
        this.speedRatio = speedRatio
    }

    setBlockNumber(blockNumber: bigint){
        this.blockNumber = blockNumber
    }

    setBlockTimeFactor(blockTimeFactor: bigint){
        this.blockTimeFactor = blockTimeFactor
    }

    setMovingMaxSpeed(movingMaxSpeed: bigint) {
        this.movingMaxSpeed = movingMaxSpeed
    }

    setMovingMinSpeed(movingMinSpeed: bigint) {
        this.movingMinSpeed = movingMinSpeed
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