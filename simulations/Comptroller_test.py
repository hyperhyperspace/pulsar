import unittest

from Comptroller import Comptroller

class TestComptroller(unittest.TestCase):

    def setUp(self):
        self.c = Comptroller()

    def test_upper(self):
        self.assertEqual('foo'.upper(), 'FOO')

    def test_addBlockSample(self):
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockNumber, 1)
        self.assertEqual(self.c.totalStaked, 9)
        self.assertEqual(self.c.totalCirculating, 1)
        self.assertEqual(self.c.stakingRatio, 90.0)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockNumber, 2)
        self.assertEqual(self.c.totalStaked, 6)
        self.assertEqual(self.c.totalCirculating, 4)
        self.assertEqual(self.c.stakingRatio, 60)


    def test_dropBlockSample(self):
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.c.dropLastBlockSample()
        self.assertEqual(self.c.blockNumber, 1)
        self.assertEqual(self.c.totalStaked, 9)
        self.assertEqual(self.c.totalCirculating, 1)
        self.assertEqual(self.c.stakingRatio, 90)
        self.c.dropLastBlockSample()
        self.assertEqual(self.c.blockNumber, 0)
        self.assertEqual(self.c.totalStaked, 10)
        self.assertEqual(self.c.totalCirculating, 1)
        self.assertEqual(self.c.stakingRatio, 90.9090909090909)

    # Block time tests

    def test_lowBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.132275132275)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.2645590129055)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.3968516424698)


    def test_hiBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 1999.867724867725)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 1999.7354584838051)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 1999.603200847662)


    def test_maxFactorBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.maxBlockTimeFactor = 2000
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)



    def test_minFactorBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.minBlockTimeFactor = 2000
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)


    # Speed ratio tests

    def test_lowSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 2.999801587301587)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 2.9996031877257074)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 2.999404801271493)


    def test_hiSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 2.999801587301587)
        self.assertEqual(self.c.currentSpeedRatio, 1)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=20000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 2.9999999868774667)
        self.assertEqual(self.c.currentSpeedRatio, 10)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 3.0001983995750114)
        self.assertEqual(self.c.currentSpeedRatio, 10)


    def test_minSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3)
        self.c.minSpeedRatio = 3
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 3)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 3)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 3)


    def test_maxSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3)
        self.c.maxSpeedRatio = 3
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 2.999801587301587)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=20000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 2.9999999868774667)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.speedRatio, 3)


    # Issuance tests

    def test_earlyBirdIssuance(self):
        self.assertEqual(self.c.currentIssuance, 20)
        self.assertEqual(self.c.velocity, 0.0)
        self.assertEqual(self.c.blockReward, 10)
        self.assertEqual(self.c.blockRewardTarget, 10)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=5, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 20)
        self.assertEqual(self.c.velocity, 3942000.0)
        self.assertEqual(self.c.blockReward, 9.999338624338625)
        self.assertEqual(self.c.blockRewardTarget, 2.536783358701167e-06)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000, 
            volume=5, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 20)
        self.assertEqual(self.c.velocity, 492750.0)
        self.assertEqual(self.c.blockReward, 9.998677292419027)
        self.assertEqual(self.c.blockRewardTarget, 2.536783358701167e-06)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=5, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 20)
        self.assertEqual(self.c.velocity, 187714.2857142857)
        self.assertEqual(self.c.blockReward, 9.99801600423831)
        self.assertEqual(self.c.blockRewardTarget, 2.536783358701167e-06)


    def test_hiIssuance(self):
        self.assertEqual(self.c.currentIssuance, 20)
        self.assertEqual(self.c.velocity, 0.0)
        self.c.blockNumber = self.c.earlyBirdPeriod + 1
        self.assertEqual(self.c.blockReward, 10)
        self.assertEqual(self.c.blockRewardTarget, 10)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=5, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 19.99867724867725)
        self.assertEqual(self.c.velocity, 3942000.0)
        self.assertEqual(self.c.blockReward, 9.999338624338625)
        self.assertEqual(self.c.blockRewardTarget, 2.5366155820240045e-06)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000, 
            volume=5, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 19.997354584838053)
        self.assertEqual(self.c.velocity, 492750.0)
        self.assertEqual(self.c.blockReward, 9.998677292419027)
        self.assertEqual(self.c.blockRewardTarget, 2.5364478164431827e-06)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=5, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 19.99603200847662)
        self.assertEqual(self.c.velocity, 187714.2857142857)
        self.assertEqual(self.c.blockReward, 9.99801600423831)
        self.assertEqual(self.c.blockRewardTarget, 2.536280061957968e-06)


    def test_lowIssuance(self):
        self.c.currentIssuance = 10.0
        self.assertEqual(self.c.currentIssuance, 10)
        self.assertEqual(self.c.velocity, 0.0)
        self.assertEqual(self.c.blockReward, 10)
        self.c.blockNumber = self.c.earlyBirdPeriod + 1
        self.c.blockReward = 1.2684755676891649e-06
        self.assertEqual(self.c.blockReward, 1.2684755676891649e-06)
        self.assertEqual(self.c.blockRewardTarget, 10)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=0.000005, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 10.000661375661375)
        self.assertEqual(self.c.velocity, 3.942)
        self.assertEqual(self.c.blockReward, 1.2684755676891649e-06)
        self.assertEqual(self.c.blockRewardTarget, 1.2684755676891649e-06)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000, 
            volume=0.000005, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 10.001322795064526)
        self.assertEqual(self.c.velocity, 0.49275)
        self.assertEqual(self.c.blockReward, 1.2685594615759168e-06)
        self.assertEqual(self.c.blockRewardTarget, 1.2685594615759166e-06)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=0.000005, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 10.001984258212348)
        self.assertEqual(self.c.velocity, 0.18771428571428572)
        self.assertEqual(self.c.blockReward, 1.2686433610112063e-06)
        self.assertEqual(self.c.blockRewardTarget, 1.2686433610112057e-06)


    def test_lowStakingRatio(self):
        self.c.currentIssuance = 10.0
        self.assertEqual(self.c.currentIssuance, 10)
        self.assertEqual(self.c.velocity, 0.0)
        self.assertEqual(self.c.blockReward, 10)
        self.c.blockNumber = self.c.earlyBirdPeriod + 1
        self.c.blockReward = 1.2684755676891649e-06
        self.assertEqual(self.c.blockReward, 1.2684755676891649e-06)
        self.assertEqual(self.c.blockRewardTarget, 10)
        self.assertEqual(self.c.stakingRatio, 100)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=0.000005, 
            newStake=0, 
            newUnstake=10, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.stakingRatio, 9.090909090909092)
        self.assertEqual(self.c.currentIssuance, 10.000661375661375)
        self.assertEqual(self.c.velocity, 0.3942)
        self.assertEqual(self.c.blockReward, 1.2685594615759168e-06)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000, 
            volume=0.000005, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.stakingRatio, 8.333333333333334)
        self.assertEqual(self.c.currentIssuance, 10.001322795064526)
        self.assertEqual(self.c.velocity, 0.1791818181818182)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=0.000005, 
            newStake=0, 
            newUnstake=0, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.stakingRatio, 8.333333333333334)
        self.assertEqual(self.c.currentIssuance, 10.001984258212348)
        self.assertEqual(self.c.velocity, 0.11945454545454547)


    def test_minIssuance(self):
        self.c.currentIssuance = 1.0
        self.assertEqual(self.c.currentIssuance, 1)
        self.assertEqual(self.c.velocity, 0.0)
        self.c.blockNumber = self.c.earlyBirdPeriod + 1
        self.assertEqual(self.c.blockReward, 10)
        self.assertEqual(self.c.blockRewardTarget, 10)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=5, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 1)
        self.assertEqual(self.c.velocity, 3942000.0)
        self.assertEqual(self.c.blockReward, 9.999338624338625)
        self.assertEqual(self.c.blockRewardTarget, 1.2683916793505834e-07)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000, 
            volume=5, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 1)
        self.assertEqual(self.c.velocity, 492750.0)
        self.assertEqual(self.c.blockReward, 9.998677292419027)
        self.assertEqual(self.c.blockRewardTarget, 1.2683916793505834e-07)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=5, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 1)
        self.assertEqual(self.c.velocity, 187714.2857142857)
        self.assertEqual(self.c.blockReward, 9.99801600423831)
        self.assertEqual(self.c.blockRewardTarget, 1.2683916793505834e-07)


    def test_maxIssuance(self):
        self.assertEqual(self.c.currentIssuance, 20)
        self.assertEqual(self.c.velocity, 0.0)
        self.c.blockNumber = self.c.earlyBirdPeriod + 1
        self.assertEqual(self.c.blockReward, 10)
        self.assertEqual(self.c.blockRewardTarget, 10)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=0.000005, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 20)
        self.assertEqual(self.c.velocity, 3.942)
        self.assertEqual(self.c.blockReward, 9.999338624338625)
        self.assertEqual(self.c.blockRewardTarget, 2.536783358701167e-06)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000, 
            volume=0.000005, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 20)
        self.assertEqual(self.c.velocity, 0.49275)
        self.assertEqual(self.c.blockReward, 9.998677292419027)
        self.assertEqual(self.c.blockRewardTarget, 2.536783358701167e-06)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
            volume=0.000005, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.currentIssuance, 20)
        self.assertEqual(self.c.velocity, 0.18771428571428572)
        self.assertEqual(self.c.blockReward, 9.99801600423831)
        self.assertEqual(self.c.blockRewardTarget, 2.536783358701167e-06)


    # Block size tests

    def test_lowBlockUtilization(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.minTxsPerBlock = 200
        self.assertEqual(self.c.txsPerBlock, 400)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.132275132275)
        self.assertEqual(self.c.txsPerBlock, 399)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.2645590129055)
        self.assertEqual(self.c.txsPerBlock, 398)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.3968516424698)
        self.assertEqual(self.c.txsPerBlock, 397)


    def test_hiBlockUtilization(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.assertEqual(self.c.txsPerBlock, 400)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=390,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.132275132275)
        self.assertEqual(self.c.txsPerBlock, 401)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=390,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.2645590129055)
        self.assertEqual(self.c.txsPerBlock, 402)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=390,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.3968516424698)
        self.assertEqual(self.c.txsPerBlock, 403)


    def test_minBlockSize(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.assertEqual(self.c.txsPerBlock, 400)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.132275132275)
        self.assertEqual(self.c.txsPerBlock, 400)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.2645590129055)
        self.assertEqual(self.c.txsPerBlock, 400)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.3968516424698)
        self.assertEqual(self.c.txsPerBlock, 400)


    def test_maxBlockSize(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.maxTxsPerBlock = 402
        self.assertEqual(self.c.txsPerBlock, 400)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=0, 
            newUnstake=1, 
            reward=2, 
            txsCount=390,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.132275132275)
        self.assertEqual(self.c.txsPerBlock, 401)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=390,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.2645590129055)
        self.assertEqual(self.c.txsPerBlock, 402)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=1, 
            newUnstake=4, 
            reward=2, 
            txsCount=390,
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.3968516424698)
        self.assertEqual(self.c.txsPerBlock, 402)










    def test_split(self):
        s = 'hello world'
        self.assertEqual(s.split(), ['hello', 'world'])
        # check that s.split fails when the separator is not a string
        with self.assertRaises(TypeError):
            s.split(2)

if __name__ == '__main__':

    unittest.main()
    exit(0)
