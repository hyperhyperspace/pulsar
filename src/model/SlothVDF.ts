
//# from https://github.com/ericchenmelt/VDF/blob/master/sloth_vdf.py

//import datetime
//import time

class SlothPermutation {

    ////////////////
   // Parameters //
  ////////////////
 
    // 2048 bits
    //static p: bigint = BigInt('18542111093677732642459272540680023393198879339367365649299639012068586613493175724387340354353111519181603382253520746587433467244389986210657924066902848991660143586720189102552949129628562600000172028774676946052646755346835583090812678091066252835235488687753628768865919970693645271980583737803244915952438318300513099580774719850018671536430927997549336608649130345154538967404891278361532297053379870415751929589720311522784991492978835850775723579826840066304564093273475005489970412907306043287050400820333253021327343980185015431134151910938109381052727042887923775405006238632313473756430774656524887983019')
    // 1024 bits
    static p: bigint = BigInt('170082004324204494273811327264862981553264701145937538369570764779791492622392118654022654452947093285873855529044371650895045691292912712699015605832276411308653107069798639938826015099738961427172366594187783204437869906954750443653318078358839409699824714551430573905637228307966826784684174483831608534979')
    // 256 bits
    //static p: bigint = BigInt('64106875808534963770974826322234655855469213855659218736479077548818158667371') 
    // 128 bits
    //static p: bigint = BigInt('297010851887946822574352571639152315287') //BigInt('73237431696005972674723595250817150843') //BigInt(73237431696005972674723595250817150843)
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
        x = x % SlothPermutation.p
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

    generateBufferProofVDF(t: bigint, x: Buffer, byteLen: number = 128): Buffer {
        let ret: Buffer = Buffer.from(new Uint8Array(byteLen))
        SlothPermutation.writeBigUIntLE(this.mod_op(SlothPermutation.readBigUIntLE(x, byteLen), t), ret, byteLen)
        return ret
    }

    verifyBufferProofVDF(t: bigint, x: Buffer, y: Buffer, byteLen: number = 128): boolean {
        return this.mod_verif(SlothPermutation.readBigUIntLE(y, byteLen), SlothPermutation.readBigUIntLE(x, byteLen), t)
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

    static readBigUIntLE(buffer: Buffer, byteLen: number, offset = 0): bigint {
      
        if (offset + byteLen > buffer.length) {
            throw new Error('Out of bounds');
        }

        let result = BigInt(0);

        for (let i=0; i<byteLen; i++) {
            result = result + BigInt(buffer[offset + i]) * BigInt(2) ** BigInt(i*8);
        }
      
        return result;
    }

    static writeBigUIntLE(x: bigint, buffer: Buffer, byteLen: number, offset = 0) {

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
