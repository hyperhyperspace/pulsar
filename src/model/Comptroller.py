
import statistics
import math

class Comptroller(object):

    # PARAMETERS

    # Rationale: 12 o 15 seconds has uncles, and 44 has almost no uncles, average tx wait is 1.5x then for 40 secs is 60 seconds.
    targetBlockTime = 40 # seconds
    # Rationale: want something robust but flexible, 24 sounds to flexible and 1 week to rigid, 48 hrs sounds a tradeoff.
    windowSize = 60 * 60 * 24 * 7 // targetBlockTime # 15120 blocks
    # Extra buffer if we need to reorganize and drop the last blocks.
    windowExtraBuffer = windowSize 
    blocksPerYear = 60 * 60 * 24 * 365 / targetBlockTime
    windowsPerYear = blocksPerYear / windowSize
    # Rational: Cosmos has this max issuance, FED also showd this max in the last 50 years.
    # Issuance is over total coins, staked or not.
    maxIssuance = 20 # %
    # Rationaled: we dont want 0% issuance to have >0 inventives, sounds like a reasonable national inflation standard.
    nonCircularMinIssuance =  1 # %    
    # Rationale: stable Velocity of USD money (M1) during 1970-2000s (https://fred.stlouisfed.org/series/M1V)
    # Analysis: https://www.mckendree.edu/academics/scholars/issue14/shrestha.htm
    # Finally, one can come up with a theoretical conclusion-the rise in interest rate will make people decrease their time interval, 
    # thus increasing the frequency of exchange. As velocity of money is inversely related to the time interval or is directly related
    # to the frequency of exchange, as interest rates rise, the velocity of money increases. Also, it is logical, because as the interest
    # rate rises, rather than holding money people will try gaining advantages from the high interest rate. Hence, the reduction in average
    # holding of money causes the velocity of money to rise.
    # IMPORTANT: Velocity is computed over total circulating coins, staked coins are not considered circulating because you need 48hrs to unstake them.
    # http://charts.woobull.com/bitcoin-velocity/
    upperBandVelocity = 9 # times per year
    lowerBandVelocity = 5 # times per year
    earlyBirdPeriod = 60 * 60 * 24 * 30 / targetBlockTime # blocks = 30 days
    bootstrapPeriod = 60 * 60 * 24 * 365 / targetBlockTime # blocks = 6 months
    circularBootstrapPeriod = 60 * 60 * 24 * 365 * 2 / targetBlockTime # 2 years
    circularConvergencePeriod = 60 * 60 * 24 * 365 * 2 / targetBlockTime # 1 years
    # staking Ratio bounds
    minimumStakingRatio = 20 # %
    maximumStakingRatio = 99 # %

    minTxsPerBlock = 400
    maxTxsPerBlock = 160000
    # https://www.coindesk.com/charts-determining-ideal-block-size-bitcoin
    blockUtilizationTarget = 80 # %
    blockUtilizationTolerance = 3 # %

    initialBlockTimeFactor = 2000
    initialSpeedRateTarget = 3
    initialBlockReward = 10
    bootstrapVirtualStake = 10000

    minBlockTimeFactor = 20
    maxBlockTimeFactor = 200000

    maxSpeedRatio = 4
    minSpeedRatio = 1.1

    noiseFractionSlots = 0.20


    def __init__(self):

        # Txs per Block
        self.txsPerBlock = None

        ## Variables, going to be dynamically adjusted
        # now is currentSpeedRatio
        #const VDF_PROTECTION_BASE = Number(3.0); // will raise very slow when VDF speed gets faster

        # buffers of header data (windowSize items max)
        self.blockTimes = [] # total time to produce block (>0)
        self.difficulties = [] # vdf steps computed per block (>0)
        self.speeds = [] # vdf steps per seconds per block
        self.volumes = [] # coins moved per block
        self.staked = [] # new coins staked per block (>=0), to stake you need 48hrs idle.
        self.unstaked = [] # new coins umstaked per block (>=0)
        self.rewards = [] # new coins minted for miner rewards (>0)
        self.utilizations = [] # fraction of block txs used.

        # basic metrics
        self.blockNumber = 0
        self.totalStaked = 10 # bootstrapVirtualStake # assuming at least one bootstrapping miner
        self.totalCirculating = 0 #bootstrapVirtualStake * (100. - maximumStakingRatio ) / 100. # assuming 2% non-zero circulating.
        self.stakingRatio = 100 # % initial value 

        # complex metrics
        self.currentBlockTime = None # mean rounded
        self.currentSpeed = None # mean rounded
        self.currentMaxSpeed = None # max
        self.currentMinSpeed = None # min
        self.currentSpeedRatio = None # max / min
        self.velocity = 0.0

        # controlled variables
        self.minIssuance = self.nonCircularMinIssuance # 1%
        self.currentIssuance = None
        self.blockTimeFactor = None
        self.speedRatio = None
        self.blockRewardTarget = None
        self.blockReward = None

        # Final initialization
        self.currentIssuance = self.maxIssuance
        self.blockTimeFactor = self.initialBlockTimeFactor
        self.speedRatio = self.initialSpeedRateTarget
        self.blockReward = self.initialBlockReward
        self.blockRewardTarget = self.blockReward
        self.txsPerBlock = self.minTxsPerBlock


    def addBlockSample(self, blockTime, difficulty, volume, newStake, newUnstake, reward, txsCount):

        # update basic metrics
        self.blockNumber += 1
        assert( newStake <= self.totalCirculating )
        assert( newUnstake <= self.totalStaked )  
        self.totalStaked += newStake - newUnstake
        if self.totalStaked < 1: #self.bootstrapVirtualStake: # always minimum
            self.totalStaked = 1 #self.bootstrapVirtualStake
        self.totalCirculating += newUnstake - newStake
        if self.totalCirculating < 1: #self.bootstrapVirtualStake * (100. - self.maximumStakingRatio) / 100.:
            self.totalCirculating = 1 #self.bootstrapVirtualStake * (100. - self.maximumStakingRatio) / 100.
        self.stakingRatio = 100 * float(self.totalStaked) / (self.totalCirculating + self.totalStaked)

        # append to buffers
        self.blockTimes.append(blockTime)
        self.difficulties.append(difficulty)
        self.speeds.append( difficulty / blockTime )
        self.volumes.append(volume)
        self.staked.append(newStake)
        self.unstaked.append(newUnstake)
        self.utilizations.append(txsCount / self.txsPerBlock)

        if len(self.blockTimes) > self.windowSize + self.windowExtraBuffer:
            self.blockTimes = self.blockTimes[1:]
            self.difficulties = self.difficulties[1:]
            self.volumes = self.volumes[1:]
            self.staked = self.staked[1:]
            self.unstaked = self.unstaked[1:]
            self.txsCounts = self.txsCounts[1:]

        # update complex metrics
        self.updateComplexMetrics()

        # update block time control
        self.updateBlockTimeActionable()

        # update VDF ratio
        self.updateSpeedRatioTarget()

        # update Coin Issuance Rate
        self.updateIssuance()

        # update block size in Txs
        self.updateBlockSize()

    def updateComplexMetrics(self):
        # update complex metrics
        self.currentBlockTime = statistics.mean(self.blockTimes[-self.windowSize:])
        self.currentSpeed = statistics.mean(self.speeds[-self.windowSize:])
        self.currentMaxSpeed = max(self.speeds[-self.windowSize:])
        self.currentMinSpeed = min(self.speeds[-self.windowSize:])
        self.currentSpeedRatio = self.currentMaxSpeed / self.currentMinSpeed
        if len(self.volumes) < self.windowSize: # bootstrap blocks
            auxWindowsPerYear = self.blocksPerYear / len(self.volumes)
        else:
            auxWindowsPerYear = self.windowsPerYear
        self.velocity = statistics.median(self.volumes[-self.windowSize:]) * auxWindowsPerYear / self.totalCirculating
        # use mean is not enough >0 points.
        if self.velocity == 0.0:
            self.velocity = statistics.mean(self.volumes[-self.windowSize:]) * self.windowsPerYear / self.totalCirculating
        self.meanBlockUtilization = statistics.mean(self.utilizations[-self.windowSize:])


    def dropLastBlockSample(self):

        # update basic metrics
        if self.blockNumber > 0:
            self.blockNumber -= 1
        else: # do nothing if already empty.
            return
        if len(self.blockTimes) == 0:
            return

        self.totalStaked -= self.staked[-1] - self.unstaked[-1]
        if self.totalStaked < 1: #self.bootstrapVirtualStake: # always minimum
            self.totalStaked = 1 #self.bootstrapVirtualStake
        self.totalCirculating -= self.unstaked[-1] - self.staked[-1]
        if self.totalCirculating < 1: #self.bootstrapVirtualStake * (100. - self.maximumStakingRatio) / 100.:
            self.totalCirculating = 1 #self.bootstrapVirtualStake * (100. - self.maximumStakingRatio) / 100.
        self.stakingRatio = 100 * float(self.totalStaked) / (self.totalCirculating + self.totalStaked)

        # append to buffers
        self.blockTimes.pop()
        self.difficulties.pop()
        self.speeds.pop()
        self.volumes.pop()
        self.staked.pop()
        self.unstaked.pop()
        self.utilizations.pop()

        if len(self.blockTimes) == 0:
            self.currentBlockTime = None # mean rounded
            self.currentSpeed = None # mean rounded
            self.currentMaxSpeed = None # max
            self.currentMinSpeed = None # min
            self.currentSpeedRatio = None # max / min
            self.velocity = 0.0
            return

        # update complex metrics
        self.updateComplexMetrics()

        # update block time control
        self.updateBlockTimeActionable()

        # update VDF ratio
        self.updateSpeedRatioTarget()

        # update Coin Issuance Rate
        self.updateIssuance()

        # update block size in Txs
        self.updateBlockSize()


    def updateBlockTimeActionable(self):
        if self.currentBlockTime > self.targetBlockTime:
            self.blockTimeFactor = self.blockTimeFactor * float(self.windowSize-1)/self.windowSize
        elif self.currentBlockTime < self.targetBlockTime:
            self.blockTimeFactor = self.blockTimeFactor * float(self.windowSize+1)/self.windowSize
        else: # ==
            pass   
        if self.blockTimeFactor < self.minBlockTimeFactor:
            self.blockTimeFactor = self.minBlockTimeFactor
        if self.blockTimeFactor > self.maxBlockTimeFactor:
            self.blockTimeFactor = self.maxBlockTimeFactor


    def updateSpeedRatioTarget(self):
        # extra 0.1 for max speedRatio
        if self.currentSpeedRatio > self.speedRatio:
            self.speedRatio = self.speedRatio * (self.windowSize+1)/self.windowSize
        elif self.currentSpeedRatio < self.speedRatio:
            self.speedRatio = self.speedRatio * (self.windowSize-1)/self.windowSize
        else: # ==
            pass   
        if self.speedRatio < self.minSpeedRatio:
            self.speedRatio = self.minSpeedRatio
        if self.speedRatio > self.maxSpeedRatio:
            self.speedRatio = self.maxSpeedRatio

    
    def updateIssuance(self):
        # early bird issuance
        if self.blockNumber < self.earlyBirdPeriod:
            self.currentIssuance = self.maxIssuance
        # circular economy convergence
        elif self.blockNumber >= self.circularBootstrapPeriod and \
            self.blockNumber < self.circularBootstrapPeriod + self.circularConvergencePeriod:
            self.minIssuance = self.nonCircularMinIssuance * (self.circularBootstrapPeriod + self.circularConvergencePeriod - self.blockNumber) / \
                                self.circularConvergencePeriod
        # regular adaptability
        elif self.velocity < self.lowerBandVelocity or self.stakingRatio < self.minimumStakingRatio:
            self.currentIssuance = self.currentIssuance * (self.windowSize+1)/self.windowSize
        elif self.velocity > self.upperBandVelocity or self.stakingRatio > self.maximumStakingRatio:
            self.currentIssuance = self.currentIssuance * (self.windowSize-1)/self.windowSize
        else: # ==
            pass
        # check limits min/max
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


    def updateBlockSize(self):
        if self.meanBlockUtilization * 100 > self.blockUtilizationTarget + self.blockUtilizationTolerance: # is %
            self.txsPerBlock = self.txsPerBlock + 1 # additive change
        elif self.meanBlockUtilization * 100 < self.blockUtilizationTarget - self.blockUtilizationTolerance:
            self.txsPerBlock = self.txsPerBlock - 1 # additive change
        else: # ==
            pass   
        if self.txsPerBlock < self.minTxsPerBlock:
            self.txsPerBlock = self.minTxsPerBlock
        if self.txsPerBlock > self.maxTxsPerBlock:
            self.txsPerBlock = self.maxTxsPerBlock

    ## VDF Difficulty calculations

    # vrfSeed is a bigint representing the signature of the current block number
    # by the current miner.
    def slotByStake(self, coins, totalCoins, vrfSeed): 
        if self.blockNumber < self.bootstrapPeriod:
            totalCoins += self.bootstrapVirtualStake
        slots = math.ceil(float(totalCoins) / float(coins))
        if (slots > 2 ** 32 - 1):
            slots = 2 ** 32 - 1
        randomSlot = (vrfSeed % int(slots)) + 1
        return randomSlot


    def noise(self, vrfSeed):
        # Noise
        noise = float(vrfSeed % 2**256)
        noise /= float(2**256)
        noise -= 0.5
        noise *= self.noiseFractionSlots
        return noise


    def slotByStakeWithNoise(self, coins, totalCoins, vrfSeed):
        slots = math.ceil(float(totalCoins) / float(coins))
        if (slots > 2 ** 32 - 1):
            slots = 2 ** 32 - 1
        randomSlot = (vrfSeed % slots) + 1
        extraNoise = self.noise(vrfSeed)
        return float(randomSlot) + float(extraNoise)


    def slotByStakeProtected(self, coins, totalCoins, vrfSeed):
        randomSlot = self.slotByStakeWithNoise(coins, totalCoins, vrfSeed)
        return self.currentSpeedRatio ** float(randomSlot)


    def vdfSteps(self, coins, totalCoins, vrfSeed):
        slotProtected = self.slotByStakeProtected(coins, totalCoins, vrfSeed)
        steps = int(math.floor(self.blockTimeFactor * float(slotProtected)))
        return steps + (steps%int(2))


    ## Parameters used in next block consensus.

    def getConsensusBlockReward(self):
        return math.ceil(self.blockReward)

    def getConsensusBlockTimeFactor(self):
        return self.blockTimeFactor

    def getConsensusSpeedRatio(self):
        return self.speedRatio


    ## Informative functions

    # Rewards rate, always bigger or same than inflation
    # https://medium.com/figment/cosmos-inflation-staking-rewards-how-are-they-related-eca420f29e62
    def currentAPYforStaking(self):
        if self.totalStaked == 0:
            auxStaked = self.bootstrapVirtualStake
        else:
            auxStaked = self.totalStaked
        return self.currentIssuance * (self.totalStaked + self.totalCirculating) / auxStaked




