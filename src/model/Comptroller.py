
import statistics
import math

class Comptroller(object):

    # PARAMETERS

    # Rationale: 12 o 15 seconds has uncles, and 44 has almost no uncles, average tx wait is 1.5x then for 40 secs is 60 seconds.
    targetBlockTime = 40 # seconds
    # Rationale: want something robust but flexible, 24 sounds to flexible and 1 week to rigid, 48 hrs sounds a tradeoff.
    windowSize = 60 * 60 * 24 * 2 / targetBlockTime # 4320 blocks
    blocksPerYear = 60 * 60 * 24 * 365 / targetBlockTime
    windowsPerYear = blocksPerYear / windowSize
    # Rational: Cosmos has this max issuance, FED also showd this max in the last 50 years.
    # Issuance is over total coins, staked or not.
    maxIssuance = 20 # %
    # Rationaled: we dont want 0% issuance to have >0 inventives, sounds like a reasonable national inflation standard.
    minIssuance =  1 # %
    # Rationale: stable Velocity of USD money (M1) during 1970-2000s (https://fred.stlouisfed.org/series/M1V)
    # Analysis: https://www.mckendree.edu/academics/scholars/issue14/shrestha.htm
    # Finally, one can come up with a theoretical conclusion-the rise in interest rate will make people decrease their time interval, 
    # thus increasing the frequency of exchange. As velocity of money is inversely related to the time interval or is directly related
    # to the frequency of exchange, as interest rates rise, the velocity of money increases. Also, it is logical, because as the interest
    # rate rises, rather than holding money people will try gaining advantages from the high interest rate. Hence, the reduction in average
    # holding of money causes the velocity of money to rise.
    # IMPORTANT: Velocity is computed over total circulating coins, staked coins are not considered circulating because you need 48hrs to unstake them.
    upperBandVelocity = 9 # times per year
    lowerBandVelocity = 5 # times per year
    earlyBirdPeriod = 60 * 60 * 24 * 30 / targetBlockTime # blocks = 30 days
    bootstrapPeriod = 60 * 60 * 24 * 180 / targetBlockTime # blocks = 6 months

    # buffers of header data (windowSize items max)
    blockTimes = [] # total time to produce block (>0)
    difficulties = [] # vdf steps computed per block (>0)
    speeds = [] # vdf steps per seconds per block
    volumes = [] # coins moved per block
    staked = [] # new coins staked per block (>=0), to stake you need 48hrs idle.
    unstaked = [] # new coins umstaked per block (>=0)
    rewards = [] # new coins minted for miner rewards (>0)

    # basic metrics
    blockNumber = 0
    totalStaked = 0.0
    totalCirculating = 0.0

    # complex metrics
    currentBlockTime = None # mean rounded
    currentSpeed = None # mean rounded
    currentMaxSpeed = None # max
    currentMinSpeed = None # min
    currentSpeedRatio = None # max / min
    velocity = None

    # controlled variables
    currentIssuance = None
    blockTimeFactor = None
    speedRatioTarget = None
    blockRewardTarget = None
    blockReward = None
    

    INITIAL_BLOCK_TIME_FACTOR = 2000
    INITIAL_SPEED_RATIO_TARGET = 3
    INITIAL_BLOCK_REWARD = 100

    MIN_BLOCK_TIME_FACTOR = 1
    MAX_BLOCK_TIME_FACTOR = 4000

    MAX_SPEED_RATIO = 4
    MIN_SPEED_RATIO = 1.1

    def __init__(self):
        self.currentIssuance = self.maxIssuance
        self.blockTimeFactor = self.INITIAL_BLOCK_TIME_FACTOR
        self.speedRatioTarget = self.INITIAL_SPEED_RATIO_TARGET
        self.blockReward = self.INITIAL_BLOCK_REWARD


    def sampleBlock(self, blockTime, difficulty, volume, newStake, newUnstake, reward):

        # update basic metrics
        self.blockNumber += 1
        self.totalStaked += newStake - newUnstake
        self.totalCirculating += newUnstake - newStake

        # append to buffers
        self.blockTimes.append(blockTime)
        self.difficulties.append(difficulty)
        self.speeds.append( difficulty / blockTime )
        self.volumes.append(volume)
        self.staked.append(newStake)
        self.unstaked.append(newUnstake)

        if len(self.blockTimes) > self.windowSize:
            self.blockTimes = self.blockTimes[1:]
            self.difficulties = self.difficulties[1:]
            self.volumes = self.volumes[1:]
            self.staked = self.staked[1:]
            self.unstaked = self.unstaked[1:]

        # update complex metrics
        self.currentBlockTime = statistics.mean(self.blockTimes)
        self.currentSpeed = statistics.mean(self.speeds)
        if not self.currentMaxSpeed or self.speeds[-1] > self.currentMaxSpeed:
            self.currentMaxSpeed = self.speeds[-1]
        if not self.currentMinSpeed or self.speeds[-1] < self.currentMinSpeed:
            self.currentMinSpeed = self.speeds[-1]
        self.currentSpeedRatio = self.currentMaxSpeed / self.currentMinSpeed
        if len(self.volumes) < self.windowSize: # bootstrap blocks
            auxWindowsPerYear = self.blocksPerYear / len(self.volumes)
        else:
            auxWindowsPerYear = self.windowsPerYear
        self.velocity = statistics.median(self.volumes) * auxWindowsPerYear / self.totalCirculating
        # use mean is not enough >0 points.
        if self.velocity == 0.0:
            self.velocity = statistics.mean(self.volumes) * self.windowsPerYear / self.totalCirculating

        # update block time control
        self.updateBlockTimeActionable()

        # update VDF ratio
        self.updateSpeedRatioTarget()

        # update Coin Issuance Rate
        self.updateIssuance()


    def updateBlockTimeActionable(self):
        if self.currentBlockTime > self.targetBlockTime:
            self.blockTimeFactor = self.blockTimeFactor * (self.windowSize+1)/self.windowSize
        elif self.currentBlockTime < self.targetBlockTime:
            self.blockTimeFactor = self.blockTimeFactor * (self.windowSize-1)/self.windowSize
        else: # ==
            pass   
        if self.blockTimeFactor < self.MIN_BLOCK_TIME_FACTOR:
            self.blockTimeFactor = self.MIN_BLOCK_TIME_FACTOR
        if self.blockTimeFactor > self.MAX_BLOCK_TIME_FACTOR:
            self.blockTimeFactor = self.MAX_BLOCK_TIME_FACTOR


    def updateSpeedRatioTarget(self):
        if self.currentSpeedRatio > self.speedRatioTarget:
            self.speedRatioTarget = self.speedRatioTarget * (self.windowSize+1)/self.windowSize
        elif self.currentSpeedRatio < self.speedRatioTarget:
            self.speedRatioTarget = self.speedRatioTarget * (self.windowSize-1)/self.windowSize
        else: # ==
            pass   
        if self.speedRatioTarget < self.MIN_SPEED_RATIO:
            self.speedRatioTarget = self.MIN_SPEED_RATIO
        if self.speedRatioTarget > self.MAX_SPEED_RATIO:
            self.speedRatioTarget = self.MAX_SPEED_RATIO

    
    def updateIssuance(self):
        if self.velocity > self.upperBandVelocity:
            self.currentIssuance = self.currentIssuance * (self.windowSize-1)/self.windowSize
        elif self.velocity < self.lowerBandVelocity:
            self.currentIssuance = self.currentIssuance * (self.windowSize+1)/self.windowSize
        else: # ==
            pass
        if self.currentIssuance < self.minIssuance:
            self.currentIssuance = self.minIssuance   
        if self.currentIssuance > self.maxIssuance:
            self.currentIssuance = self.maxIssuance 
        # calculate individual block reward
        totalCoins = self.totalCirculating + self.totalStaked
        annualRewards = totalCoins * self.currentIssuance / 100.0
        # we use a block target, otherwise initial rewards will drop to zero due to zero coins in totalCoins.
        self.blockRewardTarget = annualRewards / self.blocksPerYear  
        if self.blockReward > self.blockRewardTarget:
            self.blockReward = self.blockReward * (self.windowSize-1)/self.windowSize
        elif self.blockReward < self.blockRewardTarget:
            self.blockReward = self.blockReward * (self.windowSize+1)/self.windowSize
        else: # ==
            pass
    

    ## Parameters used in next block consensus.

    def getConsensusBlockReward(self):
        return math.ceil(self.blockReward)

    def getConsensusBlockTimeFactor(self):
        return self.blockTimeFactor

    def getConsensusSpeedRatio(self):
        return self.speedRatioTarget




