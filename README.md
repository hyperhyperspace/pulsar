# Soliton: The Web Blockchain

**GOAL**: A Proof-of-Stake Blockchain that can fully run its the consensus on the browser with support for different CPUs speed and tolerance to Winner-Takes-All, Nothing-At-Stake and other attacks.

## Run (Hawking Testnet):

```bash
git clone git@github.com:hyperhyperspace/soliton.git
cd soliton
yarn
yarn build
yarn start --network=whisky,romeo,zulu
```

## Develop:

```bash
git clone https://github.com/hyperhyperspace/workspace.git
cd workspace
yarn
git submodule init
git submodule update
bash ./pull-all-heads.sh
bash ./build-libs.sh
cd @hyper-hyper-space/soliton
yarn
yarn build # and you're good to go
yarn test  # and good to test
```

## Setup for AWS Linux

```bash
# 0) git
sudo yum update -y
sudo yum install git -y
# 1) nodejs
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
# 2) yarn
curl -o- -L https://yarnpkg.com/install.sh | bash
# 3) start a new console
```

## Browser client available

* Web Browser P2P available (powered by Hyperhyperspace).
* Browser client, with an external signalling server help, can become a peer in a gossip network of browsers.
* Naive Key Storage in the Browser or in 3rd-party Encrypted Storage Services.

## Single-threaded Mining with a Synthetic Nakamoto Consensus

- VDF Mining.
- Private pseudo-random dice tossing per miner (using VRF).
- Fair staking, probability of mining is very close to stake percentage of the miner.

## Stake delegation for convenience

- Stake Delegation if you dont want to do Staking+Mining yourself. The stake must be locked to help the system know how much stake is at-stake on mining and consensus.

## Tokenomics

* **Simple Monetary Policy**: fixed issuance per block.

* **Bootstrap Period with Virtual Balance on each Mining Thread**: to avoid cold-start issues, each miner get and initial virtual drop for each thread mining, only during the bootstrap period of several months. For example if Alice is using only 1 thread to mine she gets 10,000 native coins to mine and if she mines 1 block she can get 10 coins as a reward. Then she has 10,000 virtual coins during the bootstrap and 10 real coins until she spends that or earn more mining rewards. During the bootstrap period she can use 10,010 coins for staking. After the bootstratp period, for example 6 months, the virtual coins cannot be used for staking/rewards, but any real non-bootstrap remain and can used for staking in the future.

## Type of Transactions (Roadmap)

Montecarlo Testnet (Testnet1) has *no* transactions.

### Core (Las Vegas Testnet [Testnet2] and Monaco Testnet [Testnet3] )

1. `transfer(to,amount)`: only if `balance(sender) >= amount`.
1. `increaseAllowance(to,amount)`.
1. `decreaseAllowance(to,amount)`.
1. `transferFrom(from,to,amount)`: only if `allowance(from,sender) >= amount`.

### Convenience

1. `stake(amount)`: moves to `staked` balance the `amount` of `sender`.
1. `unstake(amount)`: this transaction frees the funds after 7 days.
3. `delegateStake(to,amount)`: moves to `delegatedStake` of `to` the `amount` of `sender`.
3. `undelegateStake(to,amount)`: this transaction frees the funds after 7days.
6. `delayedTransfer(to,amount,delay)`: lock `amount` until `blocktime+delay` seconds happens.

### Advanced

4. `lockedTransfer(to,amount,hash)`: lock `amount` until an unlock happens. Generates an unique `txId`.
5. `unlockTransfer(txId,x,sig)`: only transfers `txId.amount` locked before if `H(x) == txId.hash` and if `sender == txId.to`.
7. `lockTimedTransfer(to,amount,delay)`: lock `amount` until `blocktime+delay` seconds happens, then it expires. Generates an unique `txId`.
8. `unlockTimedTransfer(txId,x,sig)`: only transfers `txId.amount` locked before time `blocktime+delay` and if `sender == txId.to`.
9. `initMultiSig(n,[sign_1, ..., sign_n],m)`: makes `sender` address to become a multisig wallet with `n` signataries, and needing `m` signataries to validate a transfer.
10. `multiSigTransfer(from,to,amount)`: if `sender` is in the list of signataries of multisig `from` then the signer is voting to execute the transfer, if `#signers >= m` then the transfer gets executed.
11. `multiSigReset(from)`: for `sender` in the list of signataries, the resetting of the wallet is voted, if `#signers >= m` then all incomplete votings on the address `from` are removed.

## References

1. Proof-of-Stake Longest Chain Protocols: Security vs Predictability https://arxiv.org/abs/1910.02218

## Appendix A: FAQ

### How can you use Longest-Chain like Nakamoto Consensus on a PoS blockchain? Are there formal barries to this?

There is a paper called *[Formal Barriers to Longest-Chain Proof-of-Stake Protocols](https://arxiv.org/pdf/1809.06528.pdf)* describing limitations to Longest-Chain Fork-choice on Proof-of-Stake blockchains.
Technically we are using something we call *Average Fastest Chain* as a Fork-choice, then is not exactly Nakamoto Consensus's Longest-Chain. We choose the change with the smallest average number of VDF steps per block. In the same line, this fork-choice if more difficult to attack with attacks of common types explore in bibliography ([On the Instability of Bitcoin Without the Block Reward](https://www.cs.princeton.edu/~arvindn/publications/mining_CCS.pdf)).

### How can you deal with Winner-Takes-All and discrepancies (variance) in CPUs speeds (and miner implementation speeds)?

There is something called *Speed Ratio* that is part of the consensus. This ratio allows an exponential penalty on the linear difficulty that the miner face based on the random slot that the miner recieved. The exponential penalty (within certain bounds) avoids faster miners jumping from one slot to the previous one, avoiding faster miners to propose more blocks than their stake allows (in average).

