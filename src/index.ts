import '@hyper-hyper-space/node-env';

import { Identity } from '@hyper-hyper-space/core';
import { RSAKeyPair } from '@hyper-hyper-space/core';

import { RNGImpl } from '@hyper-hyper-space/core';



import { Space, Resources } from '@hyper-hyper-space/core';

import { Blockchain as Blockchain } from './model/Blockchain';
import { BlockchainValueOp } from './model/BlockchainValueOp';

import * as readline from 'readline';
import { VDF } from './model/VDF';

async function initResources(): Promise<Resources> {
    return Resources.create();
}

async function createBlockchainSpace(resources: Resources): Promise<Space> {
    console.log();
    console.log('Generating new Blockchain...');
    let blockchain = new Blockchain(new RNGImpl().randomHexString(160));
    
    const keyPair = await RSAKeyPair.generate(1024);
    const localIdentity = Identity.fromKeyPair({}, keyPair);
    console.log('Generated keys.')

    resources.config.id = localIdentity;

    let space = Space.fromEntryPoint(blockchain, resources);
    space.startBroadcast();

    await resources.store.save(blockchain);

    blockchain.setResources(resources);
    blockchain.startSync();

    console.log();
    console.log('Blockchain is ready, wordcode is:');
    console.log();
    console.log((await space.getWordCoding()).join(' '));
    console.log();

    return space;
}

async function joinBlockchainSpace(resources: Resources, wordcode: string[]): Promise<Space> {
    const keyPair = await RSAKeyPair.generate(1024);
    const localIdentity = Identity.fromKeyPair({}, keyPair);
    resources.config.id = localIdentity;
    console.log();
    console.log('Generated keys.')

    let space = Space.fromWordCode(wordcode, resources);

    console.log();
    console.log('Trying to join randomness Blockchain with word code "' + wordcode.join(' ') + '"...');
    await space.entryPoint;
    console.log('Done.');
    console.log();

    space.startBroadcast();
    let Blockchain = await space.getEntryPoint();

    await resources.store.save(Blockchain);

    Blockchain.setResources(resources);
    Blockchain.startSync();

    return space;
}

async function main() {

    await BlockchainValueOp.vdfInit();

    let resources = await initResources();

    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log();
    console.log('Press enter to create a new Blockchain, or input the 3 code words to join computing an existing one.');
    console.log();

    let command = await new Promise((resolve: (text: string) => void/*, reject: (reason: any) => void*/) => {
        rl.question('>', (command: string) => {
            resolve(command);
        });
    });

    let space: Space;
    if (command.trim() === 'selftest') { 

        console.log('starting self test...');
        console.log();
        await VDF.compute(new RNGImpl().randomHexString(160), BigInt(10000));
        console.log();
        console.log('self test done');

        return;

    } else if (command.trim() === '') {

        space = await createBlockchainSpace(resources);

    } else {

        let wordcode: string[] = command.split(' ');

        if (wordcode.length !== 3) {
            console.log('expected 3 words, like: pineapple greatness flurry');
            console.log('cannot join Blockchain, exiting.');
            process.exit();
        }

        space = await joinBlockchainSpace(resources, wordcode);
    }

    let Blockchain = await space.getEntryPoint() as Blockchain;

    console.log('Starting VDF computation...');
    console.log();
    console.log('Using identity ' + resources.config.id.getLastHash());
    console.log();

    Blockchain.startCompute(resources.config.id);

}

main();