# Soliton: a Blockchain running in the Browser.

## Browser client available

* Web Browser P2P available (powered by Hyperhyperspace).
* Browser client, with an external signalling server help, can become a peer in a gossip network of browsers.
* Naive Key Storage in the Browser or in 3rd-party Encrypted Storage Services.

## Single-threaded Nakamoto Consensus

- VDF+VRF Consensus.
- Fair staking in a single-threaded Nakamoto Consensus (synthetic)

![Linear Integer Performance of CPUs](https://preshing.com/images/integer-perf.png)

(https://preshing.com/20120208/a-look-back-at-single-threaded-cpu-performance/)


## Stake delegation for convenience

- Stake Delegation if you dont want to do Staking+Mining yourself. The stake must be locked for the complete Epoch so funds cannot be moved to attack any shard in particular.

## State-of-the-art Monetary Policy Algorithms

- Monetary policity with:
  * Fixed Velocity of Money (target range of cash velocity) with emision fluctuating to stabilize the Velocity.
  * Range of percentages of staked coins allowed (not a fixed target percentaje of staked coins like Cosmos). if percentaje staked goes below or above the range you modify the emission rate of rewards.

## Research and the Future of Sharding

- Adaptative Sharding with Sharding Shuffling per Epoch (for example, daily):
  * Sharding by TPS.
  * Shargin by Storage limit.
  * Sharding by Coins.
  * Both.
  * Shard that have too much stake can be splited, shards too little stake can be put together. A shard with too much stake is unbalacing, and too little is more easy to attack. For example, a shard with less than 0.5% of the stake can be joined with another shard to have more than 0.5% of the stake.
  * Our estimation is that with 100 or 200 shards you reach scalability.
  * Our estimation is that Bitcoin miners spend in the order of 7 million USD per day in mining costs. Around 2.6 billion USD per year, to secure the network.
  * If 2.6 billion USD is spent in Proof-of-Stake per year we have an base estimation in one year a 2.6 billion market cap. With 50% staked, and a 1% shard we have 13 million USD of stake per shard to secure the network.
  * To have one order of magnite more capital per shard to secure, we can estimate 26 billion USD in market cap. Then each of the 100 Shards has 130 million USD, and this is more difficulty to attack.
  * The good thing about sharding is that attacks on one shard only affect the balances in that shard.



