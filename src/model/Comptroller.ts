interface Comptroller {
    
    // Actions and Consensus Checkers
    // TODO: check if blockTime will come in seconds or milliseconds, better ms.
    addBlockSample(blockTime: bigint, difficulty: bigint) : void;
    updateOrTestBlockTimeActionable(newBlockTimeFactor?: bigint);
    dupdateOrTestSpeedRatioTarget(newMovingMaxSpeed?: bigint, newMovingMinSpeed?: bigint, newSpeedRatio?: bigint);

    // Difficulty internal
    slotByStake(coins: bigint, totalCoins: bigint, vrfSeed: bigint);
    noise(vrfSeed: bigint);
    slotByStakeWithNoise(self, coins, totalCoins, vrfSeed);
    slotByStakeProtected(self, coins, totalCoins, vrfSeed);

    // Consensus Getter
    getConsensusDifficulty(self, coins, totalCoins, vrfSeed);
    getConsensusBlockReward(self);
    getBlockTimeFactor(self);
    getSpeedRatio(self);

}

export { Comptroller };