
import statistics
import math

class ComptrollerMinimal(object):

    # PARAMETERS

    # Rationale: 12 o 15 seconds has uncles, and 44 has almost no uncles, average tx wait is 1.5x then for 40 secs is 60 seconds.
    targetBlockTime = 40 # seconds
    # period with free virtual stake per wallet
    bootstrapPeriod = 60 * 60 * 24 * 365 / targetBlockTime # blocks = 6 months
    bootstrapVirtualStake = 10000

    # Rationale: want something robust but flexible, 24 sounds to flexible and 1 week to rigid, 48 hrs sounds a tradeoff.
    windowSize = 60 * 60 * 24 * 7 // targetBlockTime # 15120 blocks
    windowExtraBuffer = windowSize # buffer blocks for reorgs to under block adds.

    initialBlockTimeFactor = 2000
    initialBlockReward = 10
    bootstrapVirtualStake = 10000

    minBlockTimeFactor = 20
    maxBlockTimeFactor = 200000

    maxSpeedRatio = 4
    minSpeedRatio = 1.1
    initialMovingMaxSpeed = 15000
    initialMovingMinSpeed = 5000 
    speedRatio = None

    noiseFractionSlots = 0.20

    def __init__(self):

        ## Variables, going to be dynamically adjusted
        # now is speedRatio
        #const VDF_PROTECTION_BASE = Number(3.0); // will raise very slow when VDF speed gets faster

        # basic metrics
        self.blockNumber = 0

        # complex metrics
        self.currentBlockTime = None # mean rounded
        self.currentSpeed = None # mean rounded
        self.movingMaxSpeed = self.initialMovingMaxSpeed
        self.movingMinSpeed = self.initialMovingMinSpeed

        # controlled variables
        self.blockTimeFactor = None
        self.currentSpeedRatio = None
        self.blockReward = None

        # Final initialization
        self.blockTimeFactor = self.initialBlockTimeFactor
        self.speedRatio = self.movingMaxSpeed / self.movingMinSpeed
        self.blockReward = self.initialBlockReward


    def addBlockSample(self, blockTime, difficulty):

        # update basic metrics
        self.blockNumber += 1

        # append to buffers
        self.currentBlockTime = blockTime
        self.difficulty = difficulty
        self.currentSpeed = difficulty / blockTime

        # update block time control
        self.updateBlockTimeActionable()

        # update VDF ratio
        self.updateSpeedRatioTarget()


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
        if self.currentSpeed > self.movingMaxSpeed and self.speedRatio < self.maxSpeedRatio: # increase max
            self.movingMaxSpeed = self.movingMaxSpeed * (self.windowSize+1)/self.windowSize
        if self.currentSpeed > self.movingMaxSpeed and self.speedRatio >= self.maxSpeedRatio: # increase max and increase min
            self.movingMaxSpeed = self.movingMaxSpeed * (self.windowSize+1)/self.windowSize
            self.movingMinSpeed = self.movingMinSpeed * (self.windowSize+1)/self.windowSize
        
        if self.currentSpeed < self.movingMinSpeed and self.speedRatio < self.maxSpeedRatio: # decrease min
            self.movingMinSpeed = self.movingMinSpeed * (self.windowSize-1)/self.windowSize
        if self.currentSpeed < self.movingMinSpeed and self.speedRatio >= self.maxSpeedRatio: # decrease min and decrease max
            self.movingMaxSpeed = self.movingMaxSpeed * (self.windowSize-1)/self.windowSize
            self.movingMaxSpeed = self.movingMaxSpeed * (self.windowSize-1)/self.windowSize
        
        if self.currentSpeed < self.movingMaxSpeed and self.currentSpeed > self.movingMinSpeed and self.speedRatio > self.minSpeedRatio:            
            # in the middle, decrease max and increase min.
            self.movingMaxSpeed = self.movingMaxSpeed * (self.windowSize-1)/self.windowSize
            self.movingMinSpeed = self.movingMinSpeed * (self.windowSize+1)/self.windowSize

        # when they cross in the middle, this should not happen.
        if self.movingMaxSpeed < self.movingMinSpeed:
            # we swap them, adding the buffer of minimum ratio.
            aux = self.movingMaxSpeed
            self.movingMaxSpeed = self.movingMinSpeed * (1 + (self.minSpeedRatio/2))
            self.movingMinSpeed = aux * (1 - (self.minSpeedRatio/2))

        self.speedRatio = self.movingMaxSpeed / self.movingMinSpeed
        

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
        return self.speedRatio ** float(randomSlot)


    ## Parameters used in next block consensus.

    # VRFSEED is based on miner address and was prev hashed with the blockNumber.
    def getConsensusDifficulty(self, coins, totalCoins, vrfSeed):
        slotProtected = self.slotByStakeProtected(coins, totalCoins, vrfSeed)
        steps = int(math.floor(self.blockTimeFactor * float(slotProtected)))
        return steps + (steps%int(2))

    def getConsensusBlockReward(self):
        return self.blockReward # static 10 coins

    def getBlockTimeFactor(self):
        return self.blockTimeFactor

    def getSpeedRatio(self):
        return self.speedRatio


