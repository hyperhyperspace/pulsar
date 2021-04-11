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


    # Block time tests

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
        self.assertEqual(self.c.speedRatio, 3.0001983995750114)


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










    def test_split(self):
        s = 'hello world'
        self.assertEqual(s.split(), ['hello', 'world'])
        # check that s.split fails when the separator is not a string
        with self.assertRaises(TypeError):
            s.split(2)

if __name__ == '__main__':

    unittest.main()
    exit(0)
