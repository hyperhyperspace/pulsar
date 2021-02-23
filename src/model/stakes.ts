// https://evgenus.github.io/bigint-typescript-definitions/index.html
import { BigInt } from '@bigint-typescript-definitions';

// Constants
const NOISE_FRACTION = Number(0.10);
// Variables, going to be dynamically adjusted
const VDF_PROTECTION_BASE = Number(3.0); // will raise very slow when VDF speed gets faster
const BLOCK_TIME_ADJUSTMENT = Number(2000);

function slotByStake(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint {
    var stake = Number(coins) / Number(totalCoins);
    var slot = Math.ceil(Number(1.0) / stake);
    if (slot > 2 ** 32 - 1)
        slot = 2 ** 32 - 1;
    var randomSlot = BigInt.mod(vrfSeed, BigInt(slot)) + BigInt(1);
    return randomSlot;
}

function slotByStakeWithNoise(coins: bigint, totalCoins: bigint, vrfSeed: bigint): Number {
    var stake = Number(coins) / Number(totalCoins);
    var slot = Math.ceil(Number(1.0) / stake);
    if (slot > 2 ** 32 - 1)
        slot = 2 ** 32 - 1;
    var randomSlot = BigInt.mod(vrfSeed, BigInt(slot)) + BigInt(1);
    // Noise
    var noise = Number(BigInt.mod(vrfSeed, BigInt(2) ** BigInt(256)));
    noise /= Number(BigInt(2) ** BigInt(256));
    noise -= 0.5;
    noise *= NOISE_FRACTION;
    return Number(randomSlot) + noise;
}

function slotByStakeProtected(coins: bigint, totalCoins: bigint, vrfSeed: bigint): Number {
    var randomSlot = slotByStakeWithNoise(coins, totalCoins, vrfSeed);
    return VDF_PROTECTION_BASE ** Number(randomSlot);
}

function vdfStepsByStakeDiscreteProtected(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint {
    var slotProtected = slotByStakeProtected(coins, totalCoins, vrfSeed);
    return BigInt(Math.floor(BLOCK_TIME_ADJUSTMENT * Number(slotProtected)));
}



