import { HashedObject, Literal } from '@hyper-hyper-space/core';
import { HashedBigInt } from '../src/model/HashedBigInt';

describe('[BIGINT] Hashed representation of BigInts for HHS', () => {

    test('[BIGINT01] BigInt literalization / deliteralization test', async () => {
        const a = BigInt('64106875808534963770974826322234655855469213855659218736479077548818158667371');
        const b = -BigInt('64106875808534963770974826322234655855469213855659218736479077548818158667371');
        const c = BigInt(0);
        const d = a * BigInt(1024);

        const values = [a, b, c, d];
        const hashed = values.map((x: bigint) => new HashedBigInt(x));
        const literals = hashed.map((h: HashedBigInt) => h.toLiteral());
        const hashed_back = literals.map((l: Literal) => HashedObject.fromLiteral(l) as HashedBigInt);
        const values_back = hashed_back.map((h: HashedBigInt) => h.getValue());

        for (let i=0; i<values.length; i++) {
            expect(values[i]).toEqual(values_back[i]);
            expect(values[i]).toEqual(hashed[i].getValue());
            expect(hashed[i].hash()).toEqual(hashed_back[i].hash());
            expect(values[i]).toEqual(hashed_back[i].getValue());
            expect(await hashed[i].validate(new Map())).toBeTruthy();
            expect(await hashed_back[i].validate(new Map())).toBeTruthy();
        } 

    });

});