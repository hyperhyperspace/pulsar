
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

    maxSpeedRatio = 3.1
    minSpeedRatio = 1.3
    initialMovingMaxSpeed = 15000
    initialMovingMinSpeed = 5000 
    speedRatio = None

    noiseFractionSlots = 0.10

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
        self.updateOrTestBlockTimeActionable()

        # update VDF ratio
        self.updateOrTestSpeedRatioTarget()


    def updateOrTestBlockTimeActionable(self, newBlockTimeFactor=None):
        if self.currentBlockTime > self.targetBlockTime:
            validBlockTimeFactor = self.blockTimeFactor * float(self.windowSize-1)/self.windowSize
        elif self.currentBlockTime < self.targetBlockTime:
            validBlockTimeFactor = self.blockTimeFactor * float(self.windowSize+1)/self.windowSize
        else: # ==
            validBlockTimeFactor = self.blockTimeFactor  
        if validBlockTimeFactor < self.minBlockTimeFactor:
            validBlockTimeFactor = self.minBlockTimeFactor
        if validBlockTimeFactor > self.maxBlockTimeFactor:
            validBlockTimeFactor = self.maxBlockTimeFactor
        # test or update
        if newBlockTimeFactor:
            return newBlockTimeFactor == validBlockTimeFactor
        else:
            self.blockTimeFactor = validBlockTimeFactor

    # to use testing func, all parameters must be included.
    def updateOrTestSpeedRatioTarget(self, newMovingMaxSpeed=None, newMovingMinSpeed=None, newSpeedRatio=None):
        #backup
        backupMovingMaxSpeed = self.movingMaxSpeed
        backupMovingMinSpeed = self.movingMinSpeed
        backupSpeedRatio = self.speedRatio

        if self.currentSpeed > self.movingMaxSpeed and self.speedRatio < self.maxSpeedRatio: # increase max
            self.movingMaxSpeed = self.movingMaxSpeed * (self.windowSize+1)/self.windowSize
        if self.currentSpeed > self.movingMaxSpeed and self.speedRatio >= self.maxSpeedRatio: # increase max and increase min
            self.movingMaxSpeed = self.movingMaxSpeed * (self.windowSize+1)/self.windowSize
            self.movingMinSpeed = self.movingMinSpeed * (self.windowSize+1)/self.windowSize
        
        if self.currentSpeed < self.movingMinSpeed and self.speedRatio < self.maxSpeedRatio: # decrease min
            self.movingMinSpeed = self.movingMinSpeed * (self.windowSize-1)/self.windowSize
        if self.currentSpeed < self.movingMinSpeed and self.speedRatio >= self.maxSpeedRatio: # decrease min and decrease max
            self.movingMinSpeed = self.movingMinSpeed * (self.windowSize-1)/self.windowSize
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
            print('DEBUG: Unexpected Speed Cross!!!: self.movingMaxSpeed < self.movingMinSpeed')

        self.speedRatio = self.movingMaxSpeed / self.movingMinSpeed

        if newMovingMaxSpeed and newMovingMinSpeed and newSpeedRatio:
            if self.movingMaxSpeed==newMovingMaxSpeed and self.movingMinSpeed==newMovingMinSpeed and self.speedRatio==newSpeedRatio:
                return True
            else: # revert with backups, and return False
                self.movingMaxSpeed = backupMovingMaxSpeed
                self.movingMinSpeed = backupMovingMinSpeed
                self.speedRatio = backupSpeedRatio
                return False
        

    ## VDF Difficulty calculations

    # vrfSeed is a bigint representing the signature of the current block number
    # by the current miner.
    def slotByStake(self, coins, totalCoins, vrfSeed): 
        if self.blockNumber < self.bootstrapPeriod:
            totalCoins += self.bootstrapVirtualStake
        slots = math.ceil(float(totalCoins) / float(coins))
        if (slots > 2 ** 32 - 1):
            slots = 2 ** 32 - 1
        randomSlot = (vrfSeed % int(slots))
        return randomSlot


    def noise(self, vrfSeed):
        # Noise
        noise = float(vrfSeed % 2**256)
        noise /= float(2**256)
        noise *= self.noiseFractionSlots
        return noise


    def slotByStakeWithNoise(self, coins, totalCoins, vrfSeed):
        slots = math.ceil(float(totalCoins) / float(coins))
        if (slots > 2 ** 32 - 1):
            slots = 2 ** 32 - 1
        randomSlot = (vrfSeed % slots)
        extraNoise = self.noise(vrfSeed)
        return float(randomSlot) + float(extraNoise)


    def slotByStakeProtected(self, coins, totalCoins, vrfSeed):
        randomSlot = self.slotByStakeWithNoise(coins, totalCoins, vrfSeed)
        if randomSlot >= 64:
            randomSlot = 64
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


