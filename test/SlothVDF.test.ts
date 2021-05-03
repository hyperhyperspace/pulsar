import { SlothPermutation } from '../src/model/SlothVDF';

describe('[SlothVDF]', () => {

    // Block time tests

    test('[VDF01] generate and verify, small', () => {
        const sloth = new SlothPermutation();        
        let x = BigInt(10)
        SlothPermutation.p = BigInt(23)
        x = x % (SlothPermutation.p)
        const t = BigInt(50)
        let y = sloth.generateProofVDF(t, x)
        let verified = sloth.verifyProofVDF(t, x, y)
        expect(verified).toEqual( true )
    });

    test('[VDF02] generate and verify, medium', () => {
        const sloth = new SlothPermutation();        
        SlothPermutation.p = BigInt('73237431696005972674723595250817150843')
        let x = BigInt('808080818080808080818080')
        x = x % (SlothPermutation.p)
        const t = BigInt(2000)
        //let start = Date.now()
        let y = sloth.generateProofVDF(t, x)
        //console.log('Generate Elapsed: ',Date.now() - start)
        //console.log('Proof VDF: ', y)
        //start = Date.now()
        let verified = sloth.verifyProofVDF(t, x, y)
        //console.log('Verify Elapsed: ',Date.now() - start)
        expect(verified).toEqual( true )
    });

    test('[VDF03] bigint export/import from buffers', () => {


        const x = (BigInt(0x789acdef) << BigInt(32)) + BigInt(0x06543210);

        const sloth = new SlothPermutation();     

        const arr = new Uint8Array(8);
        const buf = Buffer.from(arr);


        sloth.writeBigUInt64LE(x, buf);
        const y = sloth.readBigUInt64LE(buf);

        expect(x === y).toBeTruthy();

    });

    test('[VDF04] bigint export/import from buffers of arbitrary size = 64', () => {


        const x = (BigInt(0x789acdef) << BigInt(32)) + BigInt(0x06543210);

        const sloth = new SlothPermutation();     

        const arr = new Uint8Array(8);
        const buf = Buffer.from(arr);


        sloth.writeBigUIntLE(x, buf, 8);
        const y = sloth.readBigUIntLE(buf, 8);

        expect(x === y).toBeTruthy();

    });

    test('[VDF05] bigint export/import from buffers of arbitrary size = 128', () => {


        let x = (BigInt(0x789acdef) << BigInt(32)) + BigInt(0x06543210);

        x = x + (x << BigInt(64));

        const sloth = new SlothPermutation();     

        const arr = new Uint8Array(16);
        const buf = Buffer.from(arr);


        sloth.writeBigUIntLE(x, buf, 16);
        const y = sloth.readBigUIntLE(buf, 16);

        expect(x === y).toBeTruthy();

    });

    test('[VDF06] bigint export/import from buffers of arbitrary size = 128 bits and VDF test', () => {

        let challenge = Buffer.from('137010851887946622574152571239132315287', 'hex')
        const t = BigInt(200)   
        const sloth = new SlothPermutation();    
        SlothPermutation.p = BigInt('297010851887946822574352571639152315287') 
        let proof = sloth.generateBufferProofVDF(t, challenge, 16)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof, 16)).toBeTruthy();
        challenge = proof
        let proof2 = sloth.generateBufferProofVDF(t, challenge, 16)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof2, 16)).toBeTruthy();
        challenge = proof2
        let proof3 = sloth.generateBufferProofVDF(t, challenge, 16)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof3, 16)).toBeTruthy();
        challenge = proof3
        let proof4 = sloth.generateBufferProofVDF(t, challenge, 16)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof4, 16)).toBeTruthy();
        challenge = proof4
        let proof5 = sloth.generateBufferProofVDF(t, challenge, 16)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof5, 16)).toBeTruthy();
        expect(proof === proof2 ).toEqual(false)
        expect(proof === proof3 ).toEqual(false)
        expect(proof === proof4 ).toEqual(false)
        expect(proof === proof5 ).toEqual(false)
        expect(proof2 === proof3 ).toEqual(false)
        expect(proof2 === proof4 ).toEqual(false)
        expect(proof2 === proof5 ).toEqual(false)
        expect(proof3 === proof4 ).toEqual(false)
        expect(proof3 === proof5 ).toEqual(false)
        expect(proof4 === proof5 ).toEqual(false)
    
    });

    test('[VDF07] bigint export/import from buffers of arbitrary size = 256 bits and VDF test', () => {

        let challenge = Buffer.from('c8774beca835214089860e8b01157c6c883c70f4a25e83d190b577f7f56bcfd3', 'hex')
        const t = BigInt(200) // 65368
        const sloth = new SlothPermutation();    
        // 256 bits prime
        SlothPermutation.p = BigInt('64106875808534963770974826322234655855469213855659218736479077548818158667371') 
        let proof = sloth.generateBufferProofVDF(t, challenge, 32)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof, 32)).toBeTruthy();
        challenge = proof
        let proof2 = sloth.generateBufferProofVDF(t, challenge, 32)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof2, 32)).toBeTruthy();
        challenge = proof2
        let proof3 = sloth.generateBufferProofVDF(t, challenge, 32)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof3, 32)).toBeTruthy();
        challenge = proof3
        let proof4 = sloth.generateBufferProofVDF(t, challenge, 32)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof4, 32)).toBeTruthy();
        challenge = proof4
        let proof5 = sloth.generateBufferProofVDF(t, challenge, 32)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof5, 32)).toBeTruthy();
        expect(proof === proof2 ).toEqual(false)
        expect(proof === proof3 ).toEqual(false)
        expect(proof === proof4 ).toEqual(false)
        expect(proof === proof5 ).toEqual(false)
        expect(proof2 === proof3 ).toEqual(false)
        expect(proof2 === proof4 ).toEqual(false)
        expect(proof2 === proof5 ).toEqual(false)
        expect(proof3 === proof4 ).toEqual(false)
        expect(proof3 === proof5 ).toEqual(false)
        expect(proof4 === proof5 ).toEqual(false)
    
    });

    test('[VDF08] bigint export/import from buffers of arbitrary size = 128 bits and VDF test', () => {

        let challenge = Buffer.from('137010851887946622574152571239132315287', 'hex')
        const t = BigInt(200)   
        const sloth = new SlothPermutation();    
        SlothPermutation.p = BigInt('297010851887946822574352571639152315287') 
        let proof = sloth.generateBufferProofVDF(t, challenge, 16)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof, 16)).toBeTruthy();
    });

    test('[VDF09] bigint export/import from buffers of arbitrary size = 256 bits and VDF test many steps', () => {

        let challenge = Buffer.from('c8774beca835214089860e8b01157c6c883c70f4a25e83d190b577f7f56bcfd3', 'hex')
        const t = BigInt(200) // 65368
        const sloth = new SlothPermutation();    
        // 256 bits prime
        SlothPermutation.p = BigInt('64106875808534963770974826322234655855469213855659218736479077548818158667371') 
        let proof = sloth.generateBufferProofVDF(t, challenge, 32)
        expect(sloth.verifyBufferProofVDF(t, challenge, proof, 32)).toBeTruthy();
    });



});

