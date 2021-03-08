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
    console.log('totalCoins = ' + totalCoins);
    console.log('coins = ' + coins);
    var slots = Math.ceil(Number(totalCoins) / Number(coins));
    if (slots > 2 ** 32 - 1)
        slots = 2 ** 32 - 1;
    console.log('TOTAL SLOTS = ' + slots);
    console.log('FEO = ' + (vrfSeed % BigInt(slots)));
    var randomSlot = (vrfSeed % BigInt(slots)) + BigInt(1);
    console.log('Random Slot =' + randomSlot);
    var extraNoise = noise(vrfSeed);
    console.log('Extra Noise =' + extraNoise);
    return Number(randomSlot) + Number(extraNoise);
}

function slotByStakeProtected(coins: bigint, totalCoins: bigint, vrfSeed: bigint): Number {
    var randomSlot = slotByStakeWithNoise(coins, totalCoins, vrfSeed);
    console.log( ' Slot by Stake with Noise = ' + randomSlot );
    return VDF_PROTECTION_BASE ** Number(randomSlot);
}

function vdfStepsByStakeDiscreteProtected(coins: bigint, totalCoins: bigint, vrfSeed: bigint): bigint {
    console.log('VRF Seed = ' + vrfSeed);
    var slotProtected = slotByStakeProtected(coins, totalCoins, vrfSeed);
    console.log('Slot Protected = ' + slotProtected);
    var steps = BigInt(Math.floor(BLOCK_TIME_ADJUSTMENT * Number(slotProtected)));
    return steps + (steps%BigInt(2));
}

export { slotByStake, slotByStakeWithNoise, noise, vdfStepsByStakeDiscreteProtected }
