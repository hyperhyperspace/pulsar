import { Comptroller } from '../src/model/Comptroller';
import { MiniComptroller, FixedPoint } from '../src/model/MiniComptroller';

describe('[STK] Staking and Pseudo-random Difficulty.', () => {

    // Block time tests

    test('[TIME01] test_lowBlockTime', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(20) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000925925925925) )
        mc.addBlockSample( BigInt(20) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2001852280521261) )
        mc.addBlockSample( BigInt(20) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2002779063984465) )
    })

    test('[TIME02] test_hiBlockTime', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(60) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(1999074074074074) )
        mc.addBlockSample( BigInt(60) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(1998148576817558) )
        mc.addBlockSample( BigInt(60) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(1997223508031994) )
    })

    test('[TIME03] test_maxFactorBlockTime', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        MiniComptroller.maxBlockTimeFactor = BigInt(2000) * FixedPoint.UNIT
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(20) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(20) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(20) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
    })

    test('[TIME04] test_minFactorBlockTime', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        MiniComptroller.minBlockTimeFactor = BigInt(2000) * FixedPoint.UNIT
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(60) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(60) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(60) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getBlockTimeFactor()).toEqual( BigInt(2000) * FixedPoint.UNIT )
    })

    // Speed ratio tests

     test('[TIME05] test_lowSpeedRatio', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.getSpeedRatio()).toEqual( BigInt(3) * FixedPoint.UNIT )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt(15000) * FixedPoint.UNIT )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt(5000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(350000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('2997223507635')  )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('14993055555555555') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('5002314814814814') )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(450000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('2994449584907') )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('14986114326131686') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('5004630701303154') )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(350000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('2991678229437') )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('14979176310239958') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('5006947659961164') )
    })
 

    test('[TIME05] test_hiSpeedRatio', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.getSpeedRatio()).toEqual( BigInt(3) * FixedPoint.UNIT )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt(15000) * FixedPoint.UNIT )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt(5000) * FixedPoint.UNIT )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('3001389532190')  )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('15000000000000000') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('4997685185185185') )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(2000000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('3002779064381') )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('15006944444444444') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('4997685185185185') )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(2000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('3004169883772') )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('15006944444444444') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('4995371442043895') )
    })
 

    test('[TIME05] test_minSpeedRatio', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.getSpeedRatio()).toEqual( BigInt(3) * FixedPoint.UNIT )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt(15000) * FixedPoint.UNIT )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt(5000) * FixedPoint.UNIT )
        mc.setMovingMaxSpeed( BigInt(5000 * 1.3 * Number(FixedPoint.UNIT))  )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(204000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('1298796853308')  )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('6496990740740740') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('5002314814814814') )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(204000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('1298796853308') )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('6496990740740740')  )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('5002314814814814') )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(204000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('1298796853308') )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('6496990740740740') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('5002314814814814') )
    })
 
    test('[TIME05] test_maxSpeedRatio', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.getSpeedRatio()).toEqual( BigInt(3) * FixedPoint.UNIT )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt(15000) * FixedPoint.UNIT )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt(5000) * FixedPoint.UNIT )
        mc.setMovingMaxSpeed( BigInt(15000 * 1.0333333 * Number(FixedPoint.UNIT))  )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(160000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('3101435749884')  )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('15499999500000000') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('4997685185185185') )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(800000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('3101435749884') )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('15507175425694444')  )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('4999998928326474') )
        mc.addBlockSample( BigInt(40) * FixedPoint.UNIT, BigInt(160000) )
        expect(mc.getSpeedRatio()).toEqual( BigInt('3101435749884') )
        expect(mc.getMovingMaxSpeed()).toEqual( BigInt('15499996177812178') )
        expect(mc.getMovingMinSpeed()).toEqual( BigInt('4997684114007804') )
    })

    
    // No noise.
    test('[STK00] Pseudo-random slot, small not-random seed, rounding.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStake(BigInt(3),BigInt(10),BigInt(0))).toEqual(BigInt(0));
        expect(mc.slotByStake(BigInt(3),BigInt(10),BigInt(1))).toEqual(BigInt(1));
        expect(mc.slotByStake(BigInt(3),BigInt(10),BigInt(2))).toEqual(BigInt(2));
        expect(mc.slotByStake(BigInt(3),BigInt(10),BigInt(3))).toEqual(BigInt(3));
        expect(mc.slotByStake(BigInt(3),BigInt(10),BigInt(4))).toEqual(BigInt(0));
    })
     test('[STK01] Pseudo-random slot, small not-random seed.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt(0))).toEqual(BigInt(0));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt(1))).toEqual(BigInt(1));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt(5))).toEqual(BigInt(5));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt(9))).toEqual(BigInt(9));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt(10))).toEqual(BigInt(0));
    })
    test('[STK02] Pseudo-random slot, big not-random seed.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000000'))).toEqual(BigInt(0));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000001'))).toEqual(BigInt(1));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000005'))).toEqual(BigInt(5));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000009'))).toEqual(BigInt(9));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000010'))).toEqual(BigInt(0));
    })
    test('[STK03] Pseudo-random slot, big random seed.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('52609981187550070343416422107164948455223506489520'))).toEqual(BigInt(0));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('35269204289178424466528708669105343513622000272471'))).toEqual(BigInt(1));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('18940146006418912330417223372747770698114519063662'))).toEqual(BigInt(2));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('93318326445589413015567173322633022244619258241503'))).toEqual(BigInt(3));
        expect(mc.slotByStake(BigInt(1000),BigInt(10000),BigInt('73360863086503377590964104312520850931781787794294'))).toEqual(BigInt(4));
    })
    test('[STK04] Big pseudo-random slot, big random seed.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStake(BigInt(10),BigInt(10000),BigInt('52609981187550070343416422107164948455223506489520'))).toEqual(BigInt(520));
        expect(mc.slotByStake(BigInt(10),BigInt(10000),BigInt('35269204289178424466528708669105343513622000272471'))).toEqual(BigInt(471));
        expect(mc.slotByStake(BigInt(10),BigInt(10000),BigInt('18940146006418912330417223372747770698114519063662'))).toEqual(BigInt(662));
        expect(mc.slotByStake(BigInt(10),BigInt(10000),BigInt('93318326445589413015567173322633022244619258241503'))).toEqual(BigInt(503));
        expect(mc.slotByStake(BigInt(10),BigInt(10000),BigInt('73360863086503377590964104312520850931781787794294'))).toEqual(BigInt(294));
    })

    // Only noise, 10%.
    test('[STK10] 10% noise with non-random seed.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.noise(BigInt(0))).toEqual(( BigInt(0) * FixedPoint.UNIT ));
        expect(mc.noise(BigInt(2)**BigInt(255))).toEqual(( BigInt(5) * FixedPoint.UNIT / BigInt(100)));
        expect(mc.noise(BigInt(2)**BigInt(256))).toEqual(( BigInt(0) * FixedPoint.UNIT / BigInt(100) ));
        expect(mc.noise(BigInt(2)**BigInt(256)-BigInt(1))).toEqual( BigInt(1) * FixedPoint.UNIT / BigInt(10) );
    })
    test('[STK11] 10% noise with random seed.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.noise(BigInt('52609981187550070343416422107164948455223506489520526099811875500703434164221071649484552235064895205260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520'))).toEqual( BigInt(Math.floor(0.021317818148944137 * Number(FixedPoint.UNIT))) );
        expect(mc.noise(BigInt('35269204289178424466528708669105343513622000272471352692042891784244665287086691053435136220002724713526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471'))).toEqual( BigInt(Math.floor(0.014546849422580964 * Number(FixedPoint.UNIT))) );
        expect(mc.noise(BigInt('18940146006418912330417223372747770698114519063662189401460064189123304172233727477706981145190636621894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662'))).toEqual( BigInt(Math.floor(0.04367470580286885 * Number(FixedPoint.UNIT))) );
        expect(mc.noise(BigInt('93318326445589413015567173322633022244619258241503933183264455894130155671733226330222446192582415039331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503'))).toEqual( BigInt(Math.floor(0.0720054880339581 * Number(FixedPoint.UNIT))) );
        expect(mc.noise(BigInt('73360863086503377590964104312520850931781787794294733608630865033775909641043125208509317817877942947336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294'))).toEqual( BigInt(Math.floor(0.06228213394166035 * Number(FixedPoint.UNIT))) );
    })


    // With noise, 10%.

    test('[STK05] Pseudo-random slot, small not-random seed, rounding, plus 10% noise.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStakeWithNoise(BigInt(3),BigInt(10),BigInt(2)**BigInt(256)-BigInt(4))).toEqual( BigInt(1)*FixedPoint.UNIT / BigInt(10) );
        expect(mc.slotByStakeWithNoise(BigInt(3),BigInt(10),BigInt(2)**BigInt(256)-BigInt(3))).toEqual( BigInt(11)*FixedPoint.UNIT / BigInt(10) );
        expect(mc.slotByStakeWithNoise(BigInt(3),BigInt(10), BigInt(2)**BigInt(256)-BigInt(2) )).toEqual( BigInt(21)*FixedPoint.UNIT / BigInt(10) );
        expect(mc.slotByStakeWithNoise(BigInt(3),BigInt(10), BigInt(2)**BigInt(256)-BigInt(1) )).toEqual( BigInt(31)*FixedPoint.UNIT / BigInt(10) );
        expect(mc.slotByStakeWithNoise(BigInt(3),BigInt(10), BigInt(2)**BigInt(256)-BigInt(4) )).toEqual( BigInt(1)*FixedPoint.UNIT / BigInt(10) );
    }) 
    test('[STK06] Pseudo-random slot, small not-random seed, plus 10% noise.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000), BigInt(2)**BigInt(256)-BigInt(6) )).toEqual( BigInt(1)*FixedPoint.UNIT / BigInt(10) );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000), BigInt(2)**BigInt(256)-BigInt(5) )).toEqual( BigInt(11)*FixedPoint.UNIT / BigInt(10) );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000), BigInt(2)**BigInt(256)-BigInt(4) )).toEqual( BigInt(21)*FixedPoint.UNIT / BigInt(10) );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000), BigInt(2)**BigInt(256)-BigInt(3) )).toEqual( BigInt(31)*FixedPoint.UNIT / BigInt(10) );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000), BigInt(2)**BigInt(256)-BigInt(2) )).toEqual( BigInt(41)*FixedPoint.UNIT / BigInt(10) );
    }) 
    test('[STK07] Pseudo-random slot, big not-random seed, plus 10% noise.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000000'))).toEqual( BigInt(0) * FixedPoint.UNIT );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000001'))).toEqual( BigInt(1) * FixedPoint.UNIT );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000005'))).toEqual( BigInt(5) * FixedPoint.UNIT );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000009'))).toEqual( BigInt(9) * FixedPoint.UNIT );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000010'))).toEqual( BigInt(0) * FixedPoint.UNIT );
    }) 
    test('[STK08] Pseudo-random slot, big random seed, plus 10% noise.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520'))).toEqual( BigInt(Math.floor(0.021411685163005262 * Number(FixedPoint.UNIT))) );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471'))).toEqual( BigInt(Math.floor(1.040544463275233 * Number(FixedPoint.UNIT))) );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662'))).toEqual( BigInt(Math.floor(2.000369813809675 * Number(FixedPoint.UNIT))) );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503'))).toEqual( BigInt(Math.floor(3.039320110527972 * Number(FixedPoint.UNIT))) );
        expect(mc.slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294'))).toEqual( BigInt(Math.floor(4.001099654601242 * Number(FixedPoint.UNIT))) );
    }) 
    test('[STK09] Big pseudo-random slot, big random seed, plus 10% noise.', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect(mc.slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520'))).toEqual( BigInt(Math.floor(520.021411685163 * Number(FixedPoint.UNIT))) );
        expect(mc.slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471'))).toEqual( BigInt(Math.floor(471.04054446327524 * Number(FixedPoint.UNIT))) );
        expect(mc.slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662'))).toEqual( BigInt(Math.floor(662.0003698138097 * Number(FixedPoint.UNIT))) );
        expect(mc.slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503'))).toEqual( BigInt(Math.floor(503.03932011052797 * Number(FixedPoint.UNIT))) );
        expect(mc.slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294'))).toEqual( BigInt(Math.floor(294.00109965460126 * Number(FixedPoint.UNIT))) );
    })

    // Difficulty, VDF steps, integer.

    test('[STK10] test_difficulty_smallSeed_noise', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect( mc.getConsensusDifficulty( BigInt(3), BigInt(10), BigInt(2**256)-BigInt(4)) ).toEqual( BigInt(2232) )
        expect( mc.getConsensusDifficulty( BigInt(3), BigInt(10), BigInt(2**256)-BigInt(3)) ).toEqual( BigInt(6696) )
        expect( mc.getConsensusDifficulty( BigInt(3), BigInt(10), BigInt(2**256)-BigInt(2)) ).toEqual( BigInt(20090) )
        expect( mc.getConsensusDifficulty( BigInt(3), BigInt(10), BigInt(2**256)-BigInt(1)) ).toEqual( BigInt(60270) )
        expect( mc.getConsensusDifficulty( BigInt(3), BigInt(10), BigInt(2**256)-BigInt(0)) ).toEqual( BigInt(2000) )
    })

    test('[STK11] test_difficulty_medSlot_smallSeed_noise', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1))
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(2**256)-BigInt(6)) ).toEqual( BigInt(2232) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(2**256)-BigInt(5)) ).toEqual( BigInt(6696) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(2**256)-BigInt(4)) ).toEqual( BigInt(20090) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(2**256)-BigInt(3)) ).toEqual( BigInt(60270) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(2**256)-BigInt(2)) ).toEqual( BigInt(180812) )
    })

    test('[STK12] test_difficulty_medSlot_bigNonRandomSeed_noise', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1)*FixedPoint.UNIT/FixedPoint.UNIT)
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(10)**BigInt(31)) ).toEqual( BigInt(2000) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(10)**BigInt(31)+BigInt(1)) ).toEqual( BigInt(6000) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(10)**BigInt(31)+BigInt(5)) ).toEqual( BigInt(486000) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(10)**BigInt(31)+BigInt(9)) ).toEqual( BigInt(39366000) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt(10)**BigInt(31)+BigInt(10)) ).toEqual( BigInt(2000) )
    })

    test('[STK12] test_difficulty_medSlot_bigRandomSeed_noise', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1)*FixedPoint.UNIT/FixedPoint.UNIT)
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt('5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520')) ).toEqual( BigInt(2048) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt('3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471')) ).toEqual( BigInt(6274) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt('1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662')) ).toEqual( BigInt(18008) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt('9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503')) ).toEqual( BigInt(56384) )
        expect( mc.getConsensusDifficulty( BigInt(1000), BigInt(10000), BigInt('7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294')) ).toEqual( BigInt(162196) )
    })

    test('[STK13] test_difficulty_bigSlot_bigRandomSeed_noise', () => {
        let mc = new MiniComptroller() as Comptroller;
        mc.setBlockNumber(MiniComptroller.bootstrapPeriod + BigInt(1)*FixedPoint.UNIT/FixedPoint.UNIT)
        expect( mc.getConsensusDifficulty( BigInt(10), BigInt(10000), BigInt('5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520')) ).toEqual( BigInt('6867367640585024404965563169767424') )
        expect( mc.getConsensusDifficulty( BigInt(10), BigInt(10000), BigInt('3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471')) ).toEqual( BigInt('6867367640585024404965563169767424') )
        expect( mc.getConsensusDifficulty( BigInt(10), BigInt(10000), BigInt('1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662')) ).toEqual( BigInt('6867367640585024404965563169767424') )
        expect( mc.getConsensusDifficulty( BigInt(10), BigInt(10000), BigInt('9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503')) ).toEqual( BigInt('6867367640585024404965563169767424') )
        expect( mc.getConsensusDifficulty( BigInt(10), BigInt(10000), BigInt('7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294')) ).toEqual( BigInt('6867367640585024404965563169767424') )
        expect( mc.getConsensusDifficulty( BigInt(10), BigInt(10000), BigInt('1236086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794005')) ).toEqual( BigInt('500336') )
        expect( mc.getConsensusDifficulty( BigInt(10), BigInt(10000), BigInt('1236076308750327758096410431252085093178178779429473360863086503377590964104312520850931781787794014')) ).toEqual( BigInt('10371246206') )
        expect( mc.getConsensusDifficulty( BigInt(10), BigInt(10000), BigInt('9216276108752326758096410431252085093178178779429473360863086503377590964104312520850931781787794194')) ).toEqual( BigInt('6867367640585024404965563169767424') )
    })






});

