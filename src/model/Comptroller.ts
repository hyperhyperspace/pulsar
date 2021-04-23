interface Comptroller {
    
    // Actions and Consensus Checkers
    // TODO: check if blockTime will come in seconds or milliseconds, better ms.
    addBlockSample(blockTime: bigint, difficulty: bigint) : void;
    setSpeed(blockTime: bigint, difficulty: bigint): void;
    updateOrTestBlockTimeActionable(newBlockTimeFactor?: bigint);
    updateOrTestSpeedRatioTarget(newMovingMaxSpeed?: bigint, newMovingMinSpeed?: bigint, newSpeedRatio?: bigint);

    // Difficulty internal
    slotByStake(coins: bigint, totalCoins: bigint, vrfSeed: bigint);
    noise(vrfSeed: bigint);
    slotByStakeWithNoise(coins, totalCoins, vrfSeed);
    slotByStakeProtected(coins, totalCoins, vrfSeed);

    // Consensus Getter
    getConsensusDifficulty(coins, totalCoins, vrfSeed);
    getConsensusBlockReward();
    getBlockTimeFactor();
    getSpeedRatio();
    setBlockNumber(blockNumber: bigint);
    setBlockTimeFactor(blockTimeFactor: bigint)
    getMovingMaxSpeed()
    getMovingMinSpeed()
    setMovingMaxSpeed(movingMaxSpeed: bigint)
    setMovingMinSpeed(movingMinSpeed: bigint)
    
}

export { Comptroller };