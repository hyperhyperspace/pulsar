import unittest

from ComptrollerMinimalBigInt import ComptrollerMinimalBigInt

class TestComptroller(unittest.TestCase):

    def setUp(self):
        self.c = ComptrollerMinimalBigInt()
        self.UNIT = self.c.UNIT

    def test_addBlockSample(self):
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockNumber, 1)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockNumber, 2)


    # Block time tests

    def test_lowBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000132275)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000264558)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000396850)


    def test_hiBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 1999867724)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 1999735457)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 1999603199)


    def test_maxFactorBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)
        self.c.maxBlockTimeFactor = 2000 * self.UNIT
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)



    def test_minFactorBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)
        self.c.minBlockTimeFactor = 2000 * self.UNIT
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)


    # Speed ratio tests

    def test_lowSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 5000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=350000, 
        )
        self.assertEqual(self.c.speedRatio, 2999603)
        self.assertEqual(self.c.movingMaxSpeed, 14999007936)
        self.assertEqual(self.c.movingMinSpeed, 5000330687)
        self.assertEqual(self.c.currentSpeed, 8750 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=450000, 
        )
        self.assertEqual(self.c.speedRatio, 2999206)
        self.assertEqual(self.c.movingMaxSpeed, 14998015938)
        self.assertEqual(self.c.movingMinSpeed, 5000661396)
        self.assertEqual(self.c.currentSpeed, 11250 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=350000, 
        )
        self.assertEqual(self.c.speedRatio, 2998809)
        self.assertEqual(self.c.movingMaxSpeed, 14997024005)
        self.assertEqual(self.c.movingMinSpeed, 5000992127)
        self.assertEqual(self.c.currentSpeed, 8750 * self.UNIT)


    def test_hiSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 5000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.speedRatio, 3000198)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 4999669312)
        self.assertEqual(self.c.currentSpeed, 50 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000000, 
        )
        self.assertEqual(self.c.speedRatio, 3000396)
        self.assertEqual(self.c.movingMaxSpeed, 15000992063)
        self.assertEqual(self.c.movingMinSpeed, 4999669312)
        self.assertEqual(self.c.currentSpeed, 50000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.speedRatio, 3000595)
        self.assertEqual(self.c.movingMaxSpeed, 15000992063)
        self.assertEqual(self.c.movingMinSpeed, 4999338646)
        self.assertEqual(self.c.currentSpeed, 50 * self.UNIT)


    def test_minSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 5000 * self.UNIT)
        self.c.minSpeedRatio = 3 * self.UNIT
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=400000, 
        )
        self.assertEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 5000 * self.UNIT)
        self.assertEqual(self.c.currentSpeed, 10000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=400000, 
        )
        self.assertEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 5000 * self.UNIT)
        self.assertEqual(self.c.currentSpeed, 10000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=400000, 
        )
        self.assertEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 5000 * self.UNIT)
        self.assertEqual(self.c.currentSpeed, 10000 * self.UNIT)


    def test_maxSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 5000 * self.UNIT)
        self.c.maxSpeedRatio = 3 * self.UNIT
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000000, 
        )
        self.assertAlmostEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15000992063)
        self.assertEqual(self.c.movingMinSpeed, 5000330687)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000000, 
        )
        self.assertAlmostEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15001984192)
        self.assertEqual(self.c.movingMinSpeed, 5000661396)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000000, 
        )
        self.assertAlmostEqual(self.c.speedRatio, 3 * self.UNIT)


if __name__ == '__main__':

    unittest.main()
    exit(0)
