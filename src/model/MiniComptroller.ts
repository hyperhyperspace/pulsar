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

    static minBlockTimeFactor: bigint = BigInt(20) * FixedPoint.UNIT;
    static maxBlockTimeFactor: bigint = BigInt(200000) * FixedPoint.UNIT;

    static maxSpeedRatio: bigint = BigInt(31) * (FixedPoint.UNIT/BigInt(10)); // 3.1 * UNIT
    static minSpeedRatio: bigint = BigInt(13) * (FixedPoint.UNIT/BigInt(10)); // 1.3 * UNIT
    static initialMovingMaxSpeed: bigint = BigInt(15000) * FixedPoint.UNIT;
    static initialMovingMinSpeed: bigint = BigInt(5000) * FixedPoint.UNIT;
    static speedRatio = MiniComptroller.initialMovingMaxSpeed / MiniComptroller.initialMovingMinSpeed;

    static noiseFractionSlots: bigint = BigInt(10) * (FixedPoint.UNIT/BigInt(10**2)); // 0.10 * UNIT

      ///////////
     // State //
    ///////////

    // basic metrics
    private blockNumber: bigint = BigInt(0);

    // complex metrics
    private currentBlockTime?: bigint  = undefined; // mean rounded
    private currentSpeed?: bigint = undefined; // mean rounded
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
        this.currentBlockTime = this.currentBlockTime
        this.blockTimeFactor = this.blockTimeFactor
        this.currentSpeed = this.currentSpeed
        this.currentBlockTime = this.currentBlockTime
        blockTime = blockTime
        difficulty = difficulty
    }


    updateOrTestBlockTimeActionable(newBlockTimeFactor?: bigint): boolean {
        return newBlockTimeFactor == BigInt(0)
    }


    dupdateOrTestSpeedRatioTarget(newMovingMaxSpeed?: bigint, newMovingMinSpeed?: bigint, newSpeedRatio?: bigint): boolean {
        var a = newMovingMaxSpeed;
        var b = newMovingMinSpeed;
        var c = newSpeedRatio;
        return a == b && b == c
    }

    // Difficulty internal
    slotByStake(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint {
        if (this.blockNumber < MiniComptroller.bootstrapPeriod)
            totalCoins += MiniComptroller.bootstrapVirtualStake
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
            totalCoins += MiniComptroller.bootstrapVirtualStake
        var slots: bigint = FixedPoint.divTrunc(totalCoins, coins) 
        if (FixedPoint.mulTrunc(slots, coins) < totalCoins)
            slots += FixedPoint.UNIT
        slots = FixedPoint.trunc(slots)
        if (slots > 2 ** 32 - 1)
            slots = BigInt(2 ** 32 - 1)
        var randomSlot = (vrfSeed % BigInt(slots));
        console.log('RANDOMSLOT =' + randomSlot);
        var extraNoise = this.noise(vrfSeed)
        console.log('EXTRANOISE =' + extraNoise);
        console.log('------------------------------------');
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


    getSpeedRatio() {
        return this.speedRatio
    }

    setBlockNumber(blockNumber: bigint){
        this.blockNumber = blockNumber
    }




}

export { MiniComptroller, FixedPoint };