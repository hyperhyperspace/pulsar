
//# from https://github.com/ericchenmelt/VDF/blob/master/sloth_vdf.py

//import datetime
//import time

class SlothPermutation {

    ////////////////
   // Parameters //
  ////////////////
 
    // 256 bits
    //static p: bigint = BigInt('62862552810010221080253752317266219938884120069061220269924174176771311327197') 
    // 128 bits
    static p: bigint = BigInt('297010851887946822574352571639152315287') //BigInt('73237431696005972674723595250817150843') //BigInt(73237431696005972674723595250817150843)
    // 64 bits
    //static p: bigint = BigInt('15464611967049520469') //BigInt('73237431696005972674723595250817150843') //BigInt(73237431696005972674723595250817150843)

    sqrt_mod_p_verify(y: bigint, x: bigint, p: bigint): boolean {
        if ( (y**BigInt(2)) % p != (x % p)) //(this.fast_pow(y, BigInt(2), p) != (x % p))
            return false
        else
            return true
    }

    mod(x: bigint, y: bigint): bigint {
        return (x - (x/y * y))
    }

    fast_pow(base: bigint, exponent: bigint, modulus:bigint): bigint {
        if (modulus === BigInt(1)) return BigInt(0);
        var result = BigInt(1);
        base = base % modulus;
        while (exponent > 0) {
            if (exponent % BigInt(2) === BigInt(1))  //odd number
                result = (result * base) % modulus;
            exponent = exponent / BigInt(2); //divide by 2
            base = (base * base) % modulus;
        }
        return result;
    }

    quad_res(x: bigint): boolean {
        return this.fast_pow(x, (SlothPermutation.p - BigInt(1)) / BigInt(2), SlothPermutation.p) === BigInt(1)
    }

    mod_sqrt_op(x: bigint): bigint {
        var y
        if (this.quad_res(x))
            y = this.fast_pow(x, (SlothPermutation.p + BigInt(1)) / BigInt(4), SlothPermutation.p)
        else {
            x = (-x+SlothPermutation.p) % SlothPermutation.p
            y = this.fast_pow(x, (SlothPermutation.p + BigInt(1)) / BigInt(4), SlothPermutation.p)
            }
        return y
    }

    mod_op(x: bigint, t: bigint): bigint {// hash operation on an int with t iternations
        x = x % SlothPermutation.p
        for (var i = 0; i < t; i++) {
            x = this.mod_sqrt_op(x)
        }
        return x
    }

    mod_verif(y: bigint, x: bigint, t: bigint): boolean {
        for (var i = 0; i < t; i++) {
            y = (y ** BigInt(2)) % SlothPermutation.p //this.fast_pow(y, BigInt(2),SlothVDF.p)
        }
        if (!this.quad_res(y))
            y = (-y+SlothPermutation.p) % SlothPermutation.p
        if ((x % SlothPermutation.p) === y || ((-x+SlothPermutation.p) % SlothPermutation.p) === y)
            return true
        else
            return false
    }

    generateProofVDF(t: bigint, x: bigint): bigint {
        return this.mod_op(x,t)
    }

    verifyProofVDF(t: bigint, x: bigint, y: bigint): boolean {
        return this.mod_verif(y, x, t)
    }

    generateBufferProofVDF(t: bigint, x: Buffer, byteLen: number = 16): Buffer {
        let ret: Buffer = Buffer.from(new Uint8Array(byteLen))
        this.writeBigUIntLE(this.mod_op(this.readBigUIntLE(x, byteLen), t), ret, byteLen)
        return ret
    }

    verifyBufferProofVDF(t: bigint, x: Buffer, y: Buffer, byteLen: number = 16): boolean {
        return this.mod_verif(this.readBigUIntLE(y, byteLen), this.readBigUIntLE(x, byteLen), t)
    }

    readBigUInt64LE(buffer: Buffer, offset = 0) {
        const first = buffer[offset];
        const last = buffer[offset + 7];
        if (first === undefined || last === undefined) {
          throw new Error('Out of bounds');
        }
      
        const lo = first +
          buffer[++offset] * 2 ** 8 +
          buffer[++offset] * 2 ** 16 +
          buffer[++offset] * 2 ** 24;
      
        const hi = buffer[++offset] +
          buffer[++offset] * 2 ** 8 +
          buffer[++offset] * 2 ** 16 +
          last * 2 ** 24;
      
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
    }

    writeBigUInt64LE(x: bigint, buffer: Buffer, offset = 0) {

        const first = buffer[offset];
        const last = buffer[offset + 7];
        if (first === undefined || last === undefined) {
          throw new Error('Out of bounds');
        }

        let y = BigInt(x);
        const big256 = BigInt(256);
        const big8   = BigInt(8);
        
        for (let i=0; i<8; i++) {
            buffer[offset+i] = Number(y % big256);
            y = y >> big8;
        }

    }

    readBigUIntLE(buffer: Buffer, byteLen: number, offset = 0): bigint {
      
        if (offset + byteLen > buffer.length) {
            throw new Error('Out of bounds');
        }

        let result = BigInt(0);

        for (let i=0; i<byteLen; i++) {
            result = result + BigInt(buffer[offset + i]) * BigInt(2) ** BigInt(i*8);
        }
      
        return result;
    }

    writeBigUIntLE(x: bigint, buffer: Buffer, byteLen: number, offset = 0) {

        if (offset + byteLen > buffer.length) {
            throw new Error('Out of bounds');
        }

        let y = BigInt(x);
        const big256 = BigInt(256);
        const big8   = BigInt(8);

        for (let i=0; i<byteLen; i++) {
            buffer[offset+i] = Number(y % big256);
            y = y >> big8;
        }

    }

}

export { SlothPermutation };
