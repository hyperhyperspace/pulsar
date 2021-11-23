import '@hyper-hyper-space/node-env';

import { HistorySynchronizer, Identity, SecureNetworkAgent, Store } from '@hyper-hyper-space/core';
import { RSAKeyPair } from '@hyper-hyper-space/core';

import { RNGImpl } from '@hyper-hyper-space/core';



import { Space, Resources } from '@hyper-hyper-space/core';

import { Blockchain as Blockchain } from './model/Blockchain';
import { BlockOp } from './model/BlockOp';

import * as readline from 'readline';

import { parse } from 'ts-command-line-args';

import * as fs from 'fs'
import { SQLiteBackend } from '@hyper-hyper-space/sqlite';
import { LogLevel } from '@hyper-hyper-space/core/dist/util/logging';

import { Miner } from './model/Miner';
import { FixedPoint } from 'model/MiniComptroller';
import { exit } from 'process';

interface IPulsarArguments{
    network?: string;
    coinbase?: string; // should be identity in HHS lingo, but using coinbase instead
    mode?: string;
    database?: string;
 }

// args typed as IPulsarArguments
export const args = parse<IPulsarArguments>({
    network: { type: String, alias: 'n', optional: true },
    coinbase: { type: String, alias: 'c', optional: true},
    mode: {type: String, alias: 'm', optional: true },
    database: {type: String, alias: 'db', optional: true }
});


async function main() {


    if (!fs.existsSync('./.pulsar')) {
        fs.mkdirSync('./.pulsar');
    }

    const keystore = new Store(new SQLiteBackend('.pulsar/keystore'));

    Store.operationLog.level   = LogLevel.INFO;

    SecureNetworkAgent.logger.level = LogLevel.INFO;

    HistorySynchronizer.controlLog.level  = LogLevel.INFO;
    HistorySynchronizer.sourcesLog.level  = LogLevel.INFO;
    HistorySynchronizer.stateLog.level    = LogLevel.INFO;
    HistorySynchronizer.opXferLog.level   = LogLevel.INFO;
    HistorySynchronizer.requestLog.level  = LogLevel.INFO;
    HistorySynchronizer.responseLog.level = LogLevel.INFO;
    
    Blockchain.loadLog.level   = LogLevel.INFO;
    Miner.miningLog.level = LogLevel.INFO;
    

    await BlockOp.vdfInit();

    const useFastDatabase = args.database === 'fast';

    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let identityCmd: string;
    if (args.coinbase !== undefined) {
        identityCmd = args.coinbase;
        identityCmd = identityCmd.replace(/,/g, ' ');
    } else {
        console.log();
        console.log('Press enter to create a new coinbase, or input the 3 code words of the one you want to use.');
        console.log();

        identityCmd = await new Promise((resolve: (text: string) => void/*, reject: (reason: any) => void*/) => {
            rl.question('>', (command: string) => {
                resolve(command);
            });
        });
    }

    let keypair  : RSAKeyPair | undefined = undefined;
    let identity : Identity   | undefined = undefined;

    let loadedIdentity = false;

    while (identity === undefined || keypair === undefined) {
        identityCmd = identityCmd.trim();

        if (identityCmd === '') {
            console.log();
            console.log('Enter the name of the coinbase holder (optional, leave blank for an anonymous one).');
            console.log();
    
            let name = await new Promise((resolve: (text: string) => void/*, reject: (reason: any) => void*/) => {
                rl.question('>', (command: string) => {
                    resolve(command);
                });
            });
    
            name = name.trim();
    
            const keyInfo: {name?: string} = {};
    
            if (name.length > 0) {
                keyInfo.name = name;
            }
    
            const newKeypair = await RSAKeyPair.generate(2048);
            const newIdentity = Identity.fromKeyPair(keyInfo, newKeypair);
    
            await keystore.save(newKeypair);
            await keystore.save(newIdentity);
    
            identityCmd = Space.getWordCodingFor(newIdentity).join(' ');
    
            console.log();
            console.log('3-word code for new coinbase is: ' + identityCmd);
        }

        const candidates = await keystore.loadByClass(Identity.className);

        for (const candidate of candidates.objects as Identity[]) {

            const code = Space.getWordCodingFor(candidate).join(' ');

            if (code === identityCmd) {
                identity = candidate;
                keypair  = await keystore.load(identity.getKeyPairHash()) as RSAKeyPair;
                loadedIdentity = true;
                break;
            }

        }

        if (identity === undefined || keypair === undefined) {
            console.log();
            console.log('Could not find coinbase with 3-word code "' + identityCmd + '" in the local store, please try again.');
            identityCmd = '';
        }

    }

    if (loadedIdentity) {
        console.log();
        console.log('Loaded coinbase for: ' + (identity.info?.name === undefined? 'anonymous' : identity.info?.name) + ', hash: ' + identity.hash());
    }

    let networkCmd: string;
    if (args.network !== undefined) {
        networkCmd = args.network
        networkCmd = networkCmd.replace(/,/g, ' ');
    } else {
        console.log();
        console.log('Press enter to create a new blockchain, or input the 3 code words to join computing an existing one.');
        console.log();
    
        networkCmd = await new Promise((resolve: (text: string) => void/*, reject: (reason: any) => void*/) => {
            rl.question('>', (command: string) => {
                resolve(command);
            });
        });
    }



    let resources: Resources|undefined = undefined;
    let blockchain: Blockchain|undefined = undefined;
    let space: Space;

    networkCmd = networkCmd.trim();

    if (networkCmd === '') {
        console.log();
        console.log('Generating new Blockchain...');
        blockchain = new Blockchain(new RNGImpl().randomHexString(160));

        const filename = './.pulsar/' + Space.getWordCodingFor(blockchain).join('_') + '.chain';
        const store = new Store(new SQLiteBackend(filename, useFastDatabase));

        await store.save(keypair);
        await store.save(identity);

        resources = await Resources.create({config: {id: identity}, store: store});        
        await resources.store.save(blockchain);

        space = Space.fromEntryPoint(blockchain, resources);
        space.startBroadcast();
    
        blockchain.setResources(resources);
        await blockchain.startSync();
    
        console.log();
        console.log('Blockchain is ready, wordcode is:');
        console.log();
        console.log((await space.getWordCoding()).join(' '));
        console.log();

    } else {

        let wordcode: string[] = networkCmd.split(' ');

        if (wordcode.length !== 3) {
            console.log('expected 3 words, like: pineapple,greatness,flurry');
            console.log('cannot join Blockchain, exiting.');
            process.exit();
        }

        const filename = './.pulsar/' + wordcode.join('_') + '.chain';
        const store = new Store(new SQLiteBackend(filename, useFastDatabase))

        await store.save(keypair);
        await store.save(identity);

        resources = await Resources.create({config: {id: identity}, store: store});     

        space = Space.fromWordCode(wordcode, resources);

        console.log();
        console.log('Trying to join randomness Blockchain with word code "' + wordcode.join(' ') + '"...');
        await space.entryPoint;
        console.log('Done.');
        console.log();
    
        space.startBroadcast();
        blockchain = await space.getEntryPoint() as Blockchain;
    
        await resources.store.save(blockchain);
    
        blockchain.setResources(resources);
        await blockchain.startSync();
    }



    if (args.mode === 'wallet') {

        console.log("Entering wallet mode. Enter 'help' for instructions.");

        Blockchain.loadLog.level  = LogLevel.WARNING;
        Blockchain.pruneLog.level = LogLevel.WARNING;
        Miner.miningLog.level     = LogLevel.WARNING;
        BlockOp.logger.level      = LogLevel.WARNING;

        while (true) {
            const line = await new Promise((resolve: (text: string) => void/*, reject: (reason: any) => void*/) => {
                rl.question('>', (command: string) => {
                    resolve(command);
                });
            });

            const params = line.split(' ');

            const command = params[0]

            if (command === 'exit') {
                break;
            } else if (command === 'balance') {
                let account = params.length > 1? await resources.store.load(params[1]) as Identity : identity;

                if (account === undefined) {
                    console.log('Could not find account.')
                } else {
                    console.log(account.hash() + (account.info?.name === undefined? '' : ' (' + account.info.name + ')') + ': ' + blockchain._ledger.getBalance(account.hash()));
                }
            } else if (command === 'head') { 
                if (blockchain._headBlock === undefined) {
                    console.log('This blockchain is empty');
                } else {
                    console.log('#' + blockchain._headBlock._blockNumber + ' mined by ' + blockchain._headBlock.getAuthor()?.hash() + ' at ' + new Date(Number(blockchain._headBlock.getTimestampMillisecs())/10**(FixedPoint.DECIMALS)).toLocaleString())
                }
            } else if (command === 'whales') {

                const all = Array.from(blockchain._ledger.balances.entries());
                
                all.sort((b1, b2) => { 
                    const r = b2[1] - b1[1];
                    if (r > BigInt(0)) {
                        return 1;
                    } else if (r < BigInt(0)) {
                        return -1;
                    } else {
                        return 0;
                    }
                });

                for (let i=0; i<Math.min(10, all.length); i++) {

                    const pair = all[i];

                    const account = await resources.store.load(pair[0]) as Identity;

                    if (account === undefined) {
                        console.log('Could not find account.')
                    } else {
                        console.log(pair[0] + (account.info?.name === undefined? '' : ' (' + account.info.name + ')')+': ' + pair[1]);
                    }
                }

            } else if (command === 'help') {
                console.log('Supported commands:');
                console.log('help: show this message.');
                console.log("balance [hash]: show account balance for /hash/, or of the account holder if hash is omitted.");
                console.log('head: show info about head block.')
                console.log('whales: show the accounts with largest balances.')
                console.log('exit: exit wallet.');
            }
         }

         exit(0);

    } else {

        console.log('Starting VDF computation...');
        console.log();
        console.log('Using identity ' + Space.getWordCodingFor(resources.config.id).join(' ') + ' (hash: ' + resources.config.id.hash() + ')');
        console.log();

        let miner = new Miner(blockchain, resources.config.id);

        miner.enableMining();
    }



}

main();