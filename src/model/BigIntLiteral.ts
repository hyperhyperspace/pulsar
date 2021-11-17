
type BigIntLiteral = string;

class BigIntParser {
    static write(n: bigint): BigIntLiteral {
        const sign = (n < BigInt(0)) ? '-' : '+'; 

        return sign + n.toString(16);
    }

    static read(h: BigIntLiteral): bigint {
        const p = BigIntParser.parse(h);

        const val = BigInt('0x' + p.hex);

        if (p.sign === '-') {
            return -val;
        } else {
            return val;
        }
    }

    static validate(h: BigIntLiteral|undefined): boolean {
        try {

            if (h === undefined) {
                return false;
            }

            if (typeof(h) !== 'string') {
                return false;
            }

            const p = BigIntParser.parse(h);

            if (['+', '-'].indexOf(p.sign) < 0) {
                return false;
            }

            if (!/^[0-9a-f]+$/.test(p.hex) || /^0[0-9a-f]+$/.test(p.hex)) {
                return false;
            }
            
            return true;
        } catch (e) {
            return false;
        }
    }

    private static parse(h: BigIntLiteral) : { sign:string, hex: string } {
        return { sign: h[0], hex: h.slice(1) }
    }
}

export { BigIntParser, BigIntLiteral }