interface Comptroller {
    
    // Actions and Consensus Checkers
    // TODO: check if blockTime will come in seconds or milliseconds, better ms.
    addBlockSample(blockTime: bigint, difficulty: bigint) : void;
    setSpeed(blockTime: bigint, difficulty: bigint): void;
    updateOrTestBlockTimeActionable(newBlockTimeFactor?: bigint): boolean;
    updateOrTestSpeedRatioTarget(newMovingMaxSpeed?: bigint, newMovingMinSpeed?: bigint, newSpeedRatio?: bigint): boolean;

    // Difficulty internal
    slotByStake(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint;
    noise(vrfSeed: bigint): bigint;
    slotByStakeWithNoise(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint;
    slotByStakeProtected(coins: bigint, totalCoins: bigint, vrfSeed: bigint): number;

    // Consensus Getters
    getConsensusDifficulty(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint;
    getConsensusBlockReward(): bigint;
    getConsensusBootstrapDifficulty(): bigint
    getConsensusFinalityDepth(): bigint

    // Consensus Observers
    isBootstrapPeriod(): boolean
    getBlockTimeFactor(): bigint;
    getSpeedRatio(): bigint;
    getMovingMaxSpeed(): bigint
    getMovingMinSpeed(): bigint
    getMaxSpeedRatio(): bigint
    getMinSpeedRatio(): bigint
    getSpeed(): bigint
    getLastDifficulty(): bigint
    getLastBlocktime(): bigint

    // Consensus Setters
    setSpeedRatio(speedRatio: bigint): void;
    setBlockNumber(blockNumber: bigint): void;
    setBlockTimeFactor(blockTimeFactor: bigint): void
    setMovingMaxSpeed(movingMaxSpeed: bigint): void
    setMovingMinSpeed(movingMinSpeed: bigint): void
    setMaxSpeedRatio(maxSpeedRatio: bigint): void
    setMinSpeedRatio(minSpeedRatio: bigint): void
    setBlockReward(blockReward: bigint): void

}

export { Comptroller };