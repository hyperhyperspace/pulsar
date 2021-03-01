import { slotByStake, slotByStakeWithNoise, noise } from '../src/model/stakes';

describe('[STK] Staking and Pseudo-random Difficulty.', () => {

    // No noise.
    test('[STK00] Pseudo-random slot, small not-random seed, rounding.', () => {
        expect(slotByStake(BigInt(3),BigInt(10),BigInt(0))).toEqual(BigInt(1));
        expect(slotByStake(BigInt(3),BigInt(10),BigInt(1))).toEqual(BigInt(2));
        expect(slotByStake(BigInt(3),BigInt(10),BigInt(2))).toEqual(BigInt(3));
        expect(slotByStake(BigInt(3),BigInt(10),BigInt(3))).toEqual(BigInt(4));
        expect(slotByStake(BigInt(3),BigInt(10),BigInt(4))).toEqual(BigInt(1));
    })
    test('[STK01] Pseudo-random slot, small not-random seed.', () => {
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt(0))).toEqual(BigInt(1));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt(1))).toEqual(BigInt(2));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt(5))).toEqual(BigInt(6));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt(9))).toEqual(BigInt(10));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt(10))).toEqual(BigInt(1));
    })
    test('[STK02] Pseudo-random slot, big not-random seed.', () => {
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000000'))).toEqual(BigInt(1));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000001'))).toEqual(BigInt(2));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000005'))).toEqual(BigInt(6));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000009'))).toEqual(BigInt(10));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000010'))).toEqual(BigInt(1));
    })
    test('[STK03] Pseudo-random slot, big random seed.', () => {
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('52609981187550070343416422107164948455223506489520'))).toEqual(BigInt(1));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('35269204289178424466528708669105343513622000272471'))).toEqual(BigInt(2));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('18940146006418912330417223372747770698114519063662'))).toEqual(BigInt(3));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('93318326445589413015567173322633022244619258241503'))).toEqual(BigInt(4));
        expect(slotByStake(BigInt(1000),BigInt(10000),BigInt('73360863086503377590964104312520850931781787794294'))).toEqual(BigInt(5));
    })
    test('[STK04] Big pseudo-random slot, big random seed.', () => {
        expect(slotByStake(BigInt(10),BigInt(10000),BigInt('52609981187550070343416422107164948455223506489520'))).toEqual(BigInt(521));
        expect(slotByStake(BigInt(10),BigInt(10000),BigInt('35269204289178424466528708669105343513622000272471'))).toEqual(BigInt(472));
        expect(slotByStake(BigInt(10),BigInt(10000),BigInt('18940146006418912330417223372747770698114519063662'))).toEqual(BigInt(663));
        expect(slotByStake(BigInt(10),BigInt(10000),BigInt('93318326445589413015567173322633022244619258241503'))).toEqual(BigInt(504));
        expect(slotByStake(BigInt(10),BigInt(10000),BigInt('73360863086503377590964104312520850931781787794294'))).toEqual(BigInt(295));
    })

    // With noise, 10%.
    test('[STK05] Pseudo-random slot, small not-random seed, rounding, plus 10% noise.', () => {
        expect(slotByStakeWithNoise(BigInt(3),BigInt(10),BigInt(0))).toEqual(0.9);
        expect(slotByStakeWithNoise(BigInt(3),BigInt(10),BigInt(1))).toEqual(1.9);
        expect(slotByStakeWithNoise(BigInt(3),BigInt(10),BigInt(2))).toEqual(2.9);
        expect(slotByStakeWithNoise(BigInt(3),BigInt(10),BigInt(3))).toEqual(3.9);
        expect(slotByStakeWithNoise(BigInt(3),BigInt(10),BigInt(4))).toEqual(0.9);
    }) 
    test('[STK06] Pseudo-random slot, small not-random seed, plus 10% noise.', () => {
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt(0))).toEqual(0.9);
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt(1))).toEqual(1.9);
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt(5))).toEqual(5.9);
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt(9))).toEqual(9.9);
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt(10))).toEqual(0.9);
    }) 
    test('[STK07] Pseudo-random slot, big not-random seed, plus 10% noise.', () => {
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000000'))).toEqual(0.9);
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000001'))).toEqual(1.9);
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000005'))).toEqual(5.9);
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000009'))).toEqual(9.9);
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('10000000000000000000000000000010'))).toEqual(0.9);
    }) 
    test('[STK08] Pseudo-random slot, big random seed, plus 10% noise.', () => {
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520'))).toEqual((0.9428233703260105));
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471'))).toEqual((1.981088926550466));
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662'))).toEqual((2.9007396276193496));
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503'))).toEqual((3.9786402210559446));
        expect(slotByStakeWithNoise(BigInt(1000),BigInt(10000),BigInt('7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294'))).toEqual((4.902199309202484));
    }) 
    test('[STK09] Big pseudo-random slot, big random seed, plus 10% noise.', () => {
        expect(slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('5260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520'))).toEqual((520.942823370326));
        expect(slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('3526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471'))).toEqual((471.98108892655046));
        expect(slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('1894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662'))).toEqual((662.9007396276194));
        expect(slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('9331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503'))).toEqual((503.97864022105597));
        expect(slotByStakeWithNoise(BigInt(10),BigInt(10000),BigInt('7336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294'))).toEqual((294.9021993092025));
    })

    // Only noise, 10%.
    test('[STK10] 10% noise with non-random seed.', () => {
        expect(noise(BigInt(0))).toEqual((-0.10));
        expect(noise(BigInt(2)**BigInt(255))).toEqual((0.0));
        expect(noise(BigInt(2)**BigInt(256))).toEqual((-0.10));
        expect(noise(BigInt(2)**BigInt(256)-BigInt(1))).toEqual((0.10));
    })
    test('[STK11] 10% noise with random seed.', () => {
        expect(noise(BigInt('52609981187550070343416422107164948455223506489520526099811875500703434164221071649484552235064895205260998118755007034341642210716494845522350648952052609981187550070343416422107164948455223506489520'))).toEqual((-0.05736436370211173));
        expect(noise(BigInt('35269204289178424466528708669105343513622000272471352692042891784244665287086691053435136220002724713526920428917842446652870866910534351362200027247135269204289178424466528708669105343513622000272471'))).toEqual((-0.07090630115483808));
        expect(noise(BigInt('18940146006418912330417223372747770698114519063662189401460064189123304172233727477706981145190636621894014600641891233041722337274777069811451906366218940146006418912330417223372747770698114519063662'))).toEqual((-0.012650588394262308));
        expect(noise(BigInt('93318326445589413015567173322633022244619258241503933183264455894130155671733226330222446192582415039331832644558941301556717332263302224461925824150393318326445589413015567173322633022244619258241503'))).toEqual((0.04401097606791622));
        expect(noise(BigInt('73360863086503377590964104312520850931781787794294733608630865033775909641043125208509317817877942947336086308650337759096410431252085093178178779429473360863086503377590964104312520850931781787794294'))).toEqual((0.02456426788332069));
    })

});

