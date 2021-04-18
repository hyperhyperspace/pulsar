import unittest
from math import floor

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
        self.assertEqual(self.c.blockTimeFactor, 2000132275132275)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000264559012905)
        self.c.addBlockSample(
            blockTime=20, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 2000396851642469)


    def test_hiBlockTime(self):
        self.assertEqual(self.c.blockTimeFactor, 2000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 1999867724867724)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 1999735458483804)
        self.c.addBlockSample(
            blockTime=60, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.blockTimeFactor, 1999603200847660)


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
        self.assertEqual(self.c.speedRatio, 2999603200846)
        self.assertEqual(self.c.movingMaxSpeed, 14999007936507936)
        self.assertEqual(self.c.movingMinSpeed, 5000330687830687)
        self.assertEqual(self.c.currentSpeed, 8750 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=450000, 
        )
        self.assertEqual(self.c.speedRatio, 2999206454176)
        self.assertEqual(self.c.movingMaxSpeed, 14998015938628537)
        self.assertEqual(self.c.movingMinSpeed, 5000661397532263)
        self.assertEqual(self.c.currentSpeed, 11250 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=350000, 
        )
        self.assertEqual(self.c.speedRatio, 2998809759982)
        self.assertEqual(self.c.movingMaxSpeed, 14997024006357463)
        self.assertEqual(self.c.movingMinSpeed, 5000992129106173)
        self.assertEqual(self.c.currentSpeed, 8750 * self.UNIT)


    def test_hiSpeedRatio(self):
        self.assertEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 5000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.speedRatio, 3000198425821)
        self.assertEqual(self.c.movingMaxSpeed, 15000 * self.UNIT)
        self.assertEqual(self.c.movingMinSpeed, 4999669312169312)
        self.assertEqual(self.c.currentSpeed, 50 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000000, 
        )
        self.assertEqual(self.c.speedRatio, 3000396851643)
        self.assertEqual(self.c.movingMaxSpeed, 15000992063492063)
        self.assertEqual(self.c.movingMinSpeed, 4999669312169312)
        self.assertEqual(self.c.currentSpeed, 50000 * self.UNIT)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=2000, 
        )
        self.assertEqual(self.c.speedRatio, 3000595303713)
        self.assertEqual(self.c.movingMaxSpeed, 15000992063492063)
        self.assertEqual(self.c.movingMinSpeed, 4999338646209512)
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
        self.assertEqual(self.c.movingMaxSpeed, 15000992063492063)
        self.assertEqual(self.c.movingMinSpeed, 5000330687830687)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000000, 
        )
        self.assertAlmostEqual(self.c.speedRatio, 3 * self.UNIT)
        self.assertEqual(self.c.movingMaxSpeed, 15001984192596791)
        self.assertEqual(self.c.movingMinSpeed, 5000661397532263)
        self.c.addBlockSample(
            blockTime=40, 
            difficulty=4000000, 
        )
        self.assertAlmostEqual(self.c.speedRatio, 3 * self.UNIT)

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
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-4), 0.1 * self.c.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-3), 1.1 * self.c.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-2), 2.1 * self.c.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-1), 3.1 * self.c.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 3, 10, 2**256-4), 0.1 * self.c.UNIT )


    def test_slotbyStake_medSlot_smallSeed_noise(self):
        # test('[STK06] Pseudo-random slot, small not-random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-6), 0.1 * self.c.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-5), 1.1 * self.c.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-4), 2.1 * self.c.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-3), 3.1 * self.c.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 2**256-2), 4100000000000 )
  
    def test_slotbyStake_medSlot_bigNonRandomSeed_noise(self):
        # test('[STK07] Pseudo-random slot, big not-random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000000), 0 * self.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000001), self.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000005), 5 * self.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000009), 9 * self.UNIT )
        self.assertEqual( self.c.slotByStakeWithNoise( 1000, 10000, 10000000000000000000000000000010), 0 * self.UNIT )

    def test_slotbyStake_medSlot_bigRandomSeed_noise(self):
        # test('[STK08] Pseudo-random slot, big random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertAlmostEqual( self.c.slotByStakeWithNoise( 1000, 10000, 5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520), floor(0.021411685163005262 * self.c.UNIT) )
        self.assertAlmostEqual( self.c.slotByStakeWithNoise( 1000, 10000, 3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471), floor(1.040544463275233  * self.c.UNIT) )
        self.assertAlmostEqual( self.c.slotByStakeWithNoise( 1000, 10000, 1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662), floor(2.000369813809675  * self.c.UNIT) )
        self.assertAlmostEqual( self.c.slotByStakeWithNoise( 1000, 10000, 9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503), floor(3.039320110527972  * self.c.UNIT) )
        self.assertAlmostEqual( self.c.slotByStakeWithNoise( 1000, 10000, 7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294), floor(4.001099654601242  * self.c.UNIT) )
        
    def test_slotbyStake_bigSlot_bigRandomSeed_noise(self):
        # test('[STK09] Big pseudo-random slot, big random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520), floor(520.021411685163 * self.UNIT) )
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471), floor(471.04054446327524 * self.UNIT) )
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662), floor(662.0003698138097 * self.UNIT) )
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503), floor(503.03932011052797 * self.UNIT) )
        self.assertEqual( self.c.slotByStakeWithNoise( 10, 10000, 7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294), floor(294.00109965460126 * self.UNIT) )

    # Only noise, 10%.

    def test_noise_nonRandom(self):
        # test('[STK10] 10% noise with non-random seed.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.noise( 0 ), 0.0 * self.UNIT )
        self.assertEqual( self.c.noise( 2**255 ), 0.05 * self.UNIT )
        self.assertEqual( self.c.noise( 2**256 ), 0.0 * self.UNIT )
        self.assertEqual( self.c.noise( 2**256-1 ), 0.1 * self.UNIT )

    def test_noise_random(self):
        # test('[STK11] 10% noise with random seed.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.noise( 52609981187550070343416422107164948455223506489520526099811875500703434164221071649484552235064895205260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520 ), floor(0.021317818148944137 * self.UNIT) )
        self.assertEqual( self.c.noise( 35269204289178424466528708669105343513622000272471352692042891784244665287086691053435136220002724713526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471 ), floor(0.014546849422580964 * self.UNIT) )
        self.assertEqual( self.c.noise( 18940146006418912330417223372747770698114519063662189401460064189123304172233727477706981145190636621894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662 ), floor(0.04367470580286885 * self.UNIT) )
        self.assertEqual( self.c.noise( 93318326445589413015567173322633022244619258241503933183264455894130155671733226330222446192582415039331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503 ), floor(0.0720054880339581 * self.UNIT) )
        self.assertEqual( self.c.noise( 73360863086503377590964104312520850931781787794294733608630865033775909641043125208509317817877942947336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294 ), floor(0.06228213394166035 * self.UNIT) )

    # Difficulty, VDF steps, integer.

    def test_difficulty_smallSeed_noise(self):
        # test('[STK05] Pseudo-random slot, small not-random seed, rounding, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.getConsensusDifficulty( 3, 10, 2**256-4), 2232 )
        self.assertEqual( self.c.getConsensusDifficulty( 3, 10, 2**256-3), 6696 )
        self.assertEqual( self.c.getConsensusDifficulty( 3, 10, 2**256-2), 20090 )
        self.assertEqual( self.c.getConsensusDifficulty( 3, 10, 2**256-1), 60270 )
        self.assertEqual( self.c.getConsensusDifficulty( 3, 10, 2**256-0), 2000 )


    def test_difficulty_medSlot_smallSeed_noise(self):
        # test('[STK06] Pseudo-random slot, small not-random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 2**256-6), 2232 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 2**256-5), 6696 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 2**256-4), 20090 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 2**256-3), 60270 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 2**256-2), 180812 )
  
    def test_difficulty_medSlot_bigNonRandomSeed_noise(self):
        # test('[STK07] Pseudo-random slot, big not-random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 10000000000000000000000000000000), 2000 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 10000000000000000000000000000001), 6000 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 10000000000000000000000000000005), 486000 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 10000000000000000000000000000009), 39366000 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 10000000000000000000000000000010), 2000 )

    def test_difficulty_medSlot_bigRandomSeed_noise(self):
        # test('[STK08] Pseudo-random slot, big random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520), 2048 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471), 6274 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662), 18008 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503), 56384 )
        self.assertEqual( self.c.getConsensusDifficulty( 1000, 10000, 7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294), 162196 )
        
    def test_difficulty_bigSlot_bigRandomSeed_noise(self):
        # test('[STK09] Big pseudo-random slot, big random seed, plus 10% noise.', () => {
        self.c.blockNumber = self.c.bootstrapPeriod + 1
        self.assertEqual( self.c.getConsensusDifficulty( 10, 10000, 5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520), \
            6867367640585024404965563169767424 )
        self.assertEqual( self.c.getConsensusDifficulty( 10, 10000, 3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471), \
            6867367640585024404965563169767424 )
        self.assertEqual( self.c.getConsensusDifficulty( 10, 10000, 1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662), \
            6867367640585024404965563169767424 )
        self.assertEqual( self.c.getConsensusDifficulty( 10, 10000, 9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503), \
            6867367640585024404965563169767424 )
        self.assertEqual( self.c.getConsensusDifficulty( 10, 10000, 7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294), \
            6867367640585024404965563169767424 )
        self.assertEqual( self.c.getConsensusDifficulty( 10, 10000, 1236086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794005), \
            500336 )
        self.assertEqual( self.c.getConsensusDifficulty( 10, 10000, 1236076308750327758096410431252085093178178779429473360863086503377590964104312520850931781787794014), \
            10371246206 )
        self.assertEqual( self.c.getConsensusDifficulty( 10, 10000, 9216276108752326758096410431252085093178178779429473360863086503377590964104312520850931781787794194), \
            6867367640585024404965563169767424 )


if __name__ == '__main__':

    unittest.main()
    exit(0)
