/* tslint:disable:no-var-requires */
import {SlothPermutation} from "@subspace/sloth-permutation";

export class SlothPermutationWrapper {
    /**
     * @param randomSeed Input for generating a prime, must be of `blockSize`
     * @param blockSize
     * @param rounds     Encoding/decoding rounds to be used, also called `steps` in VDF jargon.
     */
    public static async instantiate(): Promise<SlothPermutationWrapper> {
        const blockSize = 64
        return new SlothPermutationWrapper(blockSize);
    }

    private constructor(
        private readonly blockSize: number,
    ) {}

    public async encode(
        randomSeed: Uint8Array,
        rounds: number,
        data: Uint8Array
    ): Promise<Uint8Array> {
        const sloth = await SlothPermutation.instantiate(randomSeed, this.blockSize, rounds)
        return sloth.encode(data)
    }

    public generateProofVDF(
        randomSeed: Uint8Array,
        rounds: number,
        data: Uint8Array
    ): Promise<Uint8Array> {
        return this.encode(randomSeed, rounds, data)
    }

    public async decode(
        randomSeed: Uint8Array,
        rounds: number,
        data: Uint8Array
    ): Promise<Uint8Array> {
        const sloth = await SlothPermutation.instantiate(randomSeed, this.blockSize, rounds)
        return sloth.decode(data)
    }

    public async verifyProofVDF(
        randomSeed: Uint8Array,
        rounds: number,
        data: Uint8Array,
        proof: Uint8Array
    ): Promise<boolean> {
        return await this.decode(randomSeed, rounds, proof) === data
    }

}