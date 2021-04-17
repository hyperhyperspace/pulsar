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


    def test_slotbyStake_noNoise(self):
        # test('[STK00] Pseudo-random slot, small not-random seed, rounding.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStake( 3, 10, 0), 0 )
        self.assertEqual( self.c.slotByStake( 3, 10, 1), 1 )
        self.assertEqual( self.c.slotByStake( 3, 10, 2), 2 )
        self.assertEqual( self.c.slotByStake( 3, 10, 3), 3 )
        self.assertEqual( self.c.slotByStake( 3, 10, 4), 0 )
        self.assertEqual( self.c.slotByStake( 3, 10, 5), 1 )


    def test_slotbyStake_smallSeed(self):
        # test('[STK01] Pseudo-random slot, small not-random seed.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStake( 1000, 10000, 0), 0 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 1), 1 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 5), 5 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 9), 9 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 10), 0 )


    def test_slotbyStake_bigSeed(self):
        # test('[STK02] Pseudo-random slot, big not-random seed.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStake( 1000, 10000, 10000000000000000000000000000000), 0 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 10000000000000000000000000000001), 1 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 10000000000000000000000000000005), 5 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 10000000000000000000000000000009), 9 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 10000000000000000000000000000010), 0 )

    def test_slotbyStake_bigRandomSeed(self):
        # test('[STK03] Pseudo-random slot, big random seed.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStake( 1000, 10000, 52609981187550070343416422107164948455223506489520), 0 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 35269204289178424466528708669105343513622000272471), 1 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 18940146006418912330417223372747770698114519063662), 2 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 93318326445589413015567173322633022244619258241503), 3 )
        self.assertEqual( self.c.slotByStake( 1000, 10000, 73360863086503377590964104312520850931781787794294), 4 )

    def test_slotbyStake_bigSlot_bigRandomSeed(self):
        # test('[STK04] Big pseudo-random slot, big random seed.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStake( 10, 10000, 52609981187550070343416422107164948455223506489520), 520 )
        self.assertEqual( self.c.slotByStake( 10, 10000, 35269204289178424466528708669105343513622000272471), 471 )
        self.assertEqual( self.c.slotByStake( 10, 10000, 18940146006418912330417223372747770698114519063662), 662 )
        self.assertEqual( self.c.slotByStake( 10, 10000, 93318326445589413015567173322633022244619258241503), 503 )
        self.assertEqual( self.c.slotByStake( 10, 10000, 73360863086503377590964104312520850931781787794294), 294 )

    # With positive noise, 10%.

    def test_slotbyStake_smallSeed_noise(self):
        # test('[STK05] Pseudo-random slot, small not-random seed, rounding, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-4), 0.1 )
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-3), 1.1 )
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-2), 2.1 )
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-1), 3.1 )
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-4), 0.1 )


    def test_slotbyStake_medSlot_smallSeed_noise(self):
        # test('[STK06] Pseudo-random slot, small not-random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-6), 0.1 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-5), 1.1 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-4), 2.1 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-3), 3.1 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-2), 4.1 )
  
    def test_slotbyStake_medSlot_bigNonRandomSeed_noise(self):
        # test('[STK07] Pseudo-random slot, big not-random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000000), 8.636168555094445e-48 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000001), 1.0 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000005), 5.0 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000009), 9.0 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000010), 8.636168555094445e-48 )

    def test_slotbyStake_medSlot_bigRandomSeed_noise(self):
        # test('[STK08] Pseudo-random slot, big random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520), 0.021411685163005262 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471), 1.040544463275233 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662), 2.000369813809675 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503), 3.039320110527972 )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294), 4.001099654601242 )
        
    def test_slotbyStake_bigSlot_bigRandomSeed_noise(self):
        # test('[STK09] Big pseudo-random slot, big random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520), 520.021411685163 )
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471), 471.04054446327524 )
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662), 662.0003698138097 )
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503), 503.03932011052797 )
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294), 294.00109965460126 )

    # Only noise, 10%.
    
    def test_noise_nonRandom(self):
        # test('[STK10] 10% noise with non-random seed.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.noise( 0 ), 0.0 )
        self.assertEqual( self.c.noise( 2**255 ), 0.05 )
        self.assertEqual( self.c.noise( 2**256 ), 0.0 )
        self.assertEqual( self.c.noise( 2**256-1 ), 0.1 )

    def test_noise_random(self):
        # test('[STK11] 10% noise with random seed.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.noise( 52609981187550070343416422107164948455223506489520526099811875500703434164221071649484552235064895205260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520 ), 0.021317818148944137 )
        self.assertEqual( self.c.noise( 35269204289178424466528708669105343513622000272471352692042891784244665287086691053435136220002724713526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471 ), 0.014546849422580964 )
        self.assertEqual( self.c.noise( 18940146006418912330417223372747770698114519063662189401460064189123304172233727477706981145190636621894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662 ), 0.04367470580286885 )
        self.assertEqual( self.c.noise( 93318326445589413015567173322633022244619258241503933183264455894130155671733226330222446192582415039331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503 ), 0.0720054880339581 )
        self.assertEqual( self.c.noise( 73360863086503377590964104312520850931781787794294733608630865033775909641043125208509317817877942947336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294 ), 0.06228213394166035 )



if __name__ == '__main__':

    unittest.main()
    exit(0)
