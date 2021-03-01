// Constants
const NOISE_FRACTION = Number(0.20);
// Variables, going to be dynamically adjusted
const VDF_PROTECTION_BASE = Number(3.0); // will raise very slow when VDF speed gets faster
const BLOCK_TIME_ADJUSTMENT = Number(2000);

function slotByStake(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint {
    var slots = Math.ceil(Number(totalCoins) / Number(coins));
    if (slots > 2 ** 32 - 1)
        slots = 2 ** 32 - 1;
    var randomSlot = (vrfSeed % BigInt(slots)) + BigInt(1);
    return randomSlot;
}

function noise(vrfSeed: bigint): Number {
    // Noise
    var noise = Number((vrfSeed % (BigInt(2) ** BigInt(256))));
    noise /= Number(BigInt(2) ** BigInt(256));
    noise -= 0.5;
    noise *= NOISE_FRACTION;
    return noise;
}

function slotByStakeWithNoise(coins: bigint, totalCoins: bigint, vrfSeed: bigint): Number {
    var slots = Math.ceil(Number(totalCoins) / Number(coins));
    if (slots > 2 ** 32 - 1)
        slots = 2 ** 32 - 1;
    var randomSlot = (vrfSeed % BigInt(slots)) + BigInt(1);
    var extraNoise = noise(vrfSeed);
    return Number(randomSlot) + Number(extraNoise);
}

function slotByStakeProtected(coins: bigint, totalCoins: bigint, vrfSeed: bigint): Number {
    var randomSlot = slotByStakeWithNoise(coins, totalCoins, vrfSeed);
    return VDF_PROTECTION_BASE ** Number(randomSlot);
}

function vdfStepsByStakeDiscreteProtected(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint {
    var slotProtected = slotByStakeProtected(coins, totalCoins, vrfSeed);
    return BigInt(Math.floor(BLOCK_TIME_ADJUSTMENT * Number(slotProtected)));
}

export { slotByStake, slotByStakeWithNoise, noise, vdfStepsByStakeDiscreteProtected }
