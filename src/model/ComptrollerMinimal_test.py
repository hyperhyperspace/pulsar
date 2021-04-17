import unittest

from ComptrollerMinimal import ComptrollerMinimal

class TestComptroller(unittest.TestCase):

    def setUp(self):
        self.c = ComptrollerMinimal()

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
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.132275132275)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.2645590129055)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000.3968516424698)


    def test_hiBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 1999.867724867725)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 1999.7354584838051)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 1999.603200847662)


    def test_maxFactorBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.maxBlockTimeFactor = 2000
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)



    def test_minFactorBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.minBlockTimeFactor = 2000
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000)


    # Speed ratio tests

    def test_lowSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3)
        self.assertEqual(self.c.movingMaxSpeed, 15000)
        self.assertEqual(self.c.movingMinSpeed, 5000)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=350000, 
        )
        self.assertEqual(self.c.speedRatio, 2.999603200846505)
        self.assertEqual(self.c.movingMaxSpeed, 14999.007936507936)
        self.assertEqual(self.c.movingMinSpeed, 5000.330687830688)
        self.assertEqual(self.c.currentSpeed, 8750.0)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=450000, 
        )
        self.assertEqual(self.c.speedRatio, 2.9992064541761994)
        self.assertEqual(self.c.movingMaxSpeed, 14998.015938628538)
        self.assertEqual(self.c.movingMinSpeed, 5000.661397532263)
        self.assertEqual(self.c.currentSpeed, 11250.0)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=350000, 
        )
        self.assertEqual(self.c.speedRatio, 2.9988097599821417)
        self.assertEqual(self.c.movingMaxSpeed, 14997.024006357464)
        self.assertEqual(self.c.movingMinSpeed, 5000.992129106174)
        self.assertEqual(self.c.currentSpeed, 8750.0)


    def test_hiSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3)
        self.assertEqual(self.c.movingMaxSpeed, 15000)
        self.assertEqual(self.c.movingMinSpeed, 5000)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.speedRatio, 3.0001984258218135)
        self.assertEqual(self.c.movingMaxSpeed, 15000)
        self.assertEqual(self.c.movingMinSpeed, 4999.669312169312)
        self.assertEqual(self.c.currentSpeed, 50.0)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000000, 
        )
        self.assertEqual(self.c.speedRatio, 3.000396851643627)
        self.assertEqual(self.c.movingMaxSpeed, 15000.992063492064)
        self.assertEqual(self.c.movingMinSpeed, 4999.669312169312)
        self.assertEqual(self.c.currentSpeed, 50000.0)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.speedRatio, 3.0005953037139785)
        self.assertEqual(self.c.movingMaxSpeed, 15000.992063492064)
        self.assertEqual(self.c.movingMinSpeed, 4999.338646209513)
        self.assertEqual(self.c.currentSpeed, 50.0)


    def test_minSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3)
        self.assertEqual(self.c.movingMaxSpeed, 15000)
        self.assertEqual(self.c.movingMinSpeed, 5000)
        self.c.minSpeedRatio = 3
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=400000, 
        )
        self.assertEqual(self.c.speedRatio, 3)
        self.assertEqual(self.c.movingMaxSpeed, 15000)
        self.assertEqual(self.c.movingMinSpeed, 5000)
        self.assertEqual(self.c.currentSpeed, 10000.0)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=400000, 
        )
        self.assertEqual(self.c.speedRatio, 3)
        self.assertEqual(self.c.movingMaxSpeed, 15000)
        self.assertEqual(self.c.movingMinSpeed, 5000)
        self.assertEqual(self.c.currentSpeed, 10000.0)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=400000, 
        )
        self.assertEqual(self.c.speedRatio, 3)
        self.assertEqual(self.c.movingMaxSpeed, 15000)
        self.assertEqual(self.c.movingMinSpeed, 5000)
        self.assertEqual(self.c.currentSpeed, 10000.0)


    def test_maxSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3)
        self.assertEqual(self.c.movingMaxSpeed, 15000)
        self.assertEqual(self.c.movingMinSpeed, 5000)
        self.c.maxSpeedRatio = 3
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000000, 
        )
        self.assertAlmostEqual(self.c.speedRatio, 3.0)
        self.assertEqual(self.c.movingMaxSpeed, 15000.992063492064)
        self.assertEqual(self.c.movingMinSpeed, 5000.330687830688)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000000, 
        )
        self.assertAlmostEqual(self.c.speedRatio, 3.0)
        self.assertEqual(self.c.movingMaxSpeed, 15001.984192596792)
        self.assertEqual(self.c.movingMinSpeed, 5000.661397532263)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000000, 
        )
        self.assertAlmostEqual(self.c.speedRatio, 3.0)


if __name__ == '__main__':

    unittest.main()
    exit(0)
