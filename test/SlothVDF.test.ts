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
    })

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
    })


});

