import { slotByStake } from '../src/model/stakes';

describe('[RNG] Pseudo-randomness', () => {
    test('[STK01] Staking.', () => {
        expect(slotByStake(BigInt(10),BigInt(100),BigInt(12345))).toEqual(1);
    })
});