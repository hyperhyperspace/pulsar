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
            newStake=5000, 
            newUnstake=50, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockNumber, 1)
        self.assertEqual(self.c.totalStaked, 4951)
        self.assertEqual(self.c.totalCirculating, 1)
        self.assertEqual(self.c.stakingRatio, 99.97980613893377)


    def test_dropBlockSample(self):
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=5000, 
            newUnstake=50, 
            reward=2, 
            txsCount=1,
        )
        self.c.dropLastBlockSample()
        self.assertEqual(self.c.blockNumber, 0)
        self.assertEqual(self.c.totalStaked, 10000)
        self.assertEqual(self.c.totalCirculating, 4951)
        self.assertEqual(self.c.stakingRatio, 66.8851581833991)


    def test_lowBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=5000, 
            newUnstake=50, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 1999.537037037037)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
            volume=50, 
            newStake=5000, 
            newUnstake=50, 
            reward=2, 
            txsCount=1,
        )
        self.assertEqual(self.c.blockTimeFactor, 1999.074181241426)


    def test_split(self):
        s = 'hello world'
        self.assertEqual(s.split(), ['hello', 'world'])
        # check that s.split fails when the separator is not a string
        with self.assertRaises(TypeError):
            s.split(2)

if __name__ == '__main__':
    unittest.main()