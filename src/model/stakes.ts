// https://evgenus.github.io/bigint-typescript-definitions/index.html
import { BigInt } from '@bigint-typescript-definitions';

const STAKING_VDF_QUANTUM = 2000;
const VDF_PROTECTION_BASE = 3;
const NOISE_FRACTION = 0.10

function slotByStakeWithNoise(coins: bigint, totalCoins: bigint, vrfSeed: bigint): Number {
    var stake = Number(coins) / Number(totalCoins);
    var slot = Math.ceil(Number(1.0)/stake);
    if (slot > 2**32 - 1)
        slot = 2**32 - 1;
    var randomSlot = BigInt.mod(vrfSeed, BigInt(slot)) + BigInt(1);
    // Noise
    var noise = Number(BigInt.mod(vrfSeed, BigInt(2)**BigInt(256)));
    noise /= Number(BigInt(2)**BigInt(256));
    noise -= 0.5;
    noise *= NOISE_FRACTION;
    return Number(randomSlot) + noise;
}

function slotByStake(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint {
    var stake = Number(coins) / Number(totalCoins);
    var slot = Math.ceil(Number(1.0)/stake);
    if (slot > 2**32 - 1)
        slot = 2**32 - 1;
    var randomSlot = BigInt.mod(vrfSeed, BigInt(slot)) + BigInt(1);
    return randomSlot;
}

    