# Soliton: a blockchain for the browser.

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

## State-of-the-Art Tokenomics

* **Innovative Combination of Proven Tools**: Algorihmic Monetary policy (no Governance) inspired by proven [Tools of Monetary Policy](https://www.youtube.com/watch?v=rcPEkmstDek) and successful Proof-of-Stake blockchains cases like [Cosmos Network](https://www.coindesk.com/crypto/cosmos) with:
* **Minimum Stake Participation Rate at 10%**: token issuance rate is increased in the extreme case where less than 10% of the tokens are staked. A minimum participation rate is central to security and stability of Proof-of-Stake protocols. This is the fraction of the total coins that is used in Consensus Mechanism of Proof-of-Stake.
* **Economic activity is measured by Velocity of Money**: scientific research shows that for cryptocurrencies the velocity of money is best approximated with *simple ratio of on-chain transaction volume to total coin supply* (see *[Cryptocurrencies and the Velocity of Money](https://assets.pubpub.org/wnsz73oz/11581338940687.pdf)* by Pernice et al.). As we know, velocity of money is what mostly [drives prices in a economy](https://www.youtube.com/watch?v=stfSnPaaK04).
* **Velocity of Money Bands controls the Issuance Rate**: a band of lower and upper velocities of money controls the issuance rate of the native coin. We cansider Proof-of-Stake blockchains coins similar to M2 supply in traditional economics because coins are unlocked and free to transfer and coins stake are also liquid because can be unstaked very quickly if delegated (see [Velociy of Money for M2](https://fred.stlouisfed.org/series/M2V)). For example, we can choose *L = 6* and *U = 8* to be annual lower and upper bounds on the velocity of money. If the current velocity of below *L* we can consider the network to be in a *depressed* state, then the consensu will increase the target issuance rate of coins until the velocity increases again. If the current velocity is above *U* we can consider the network to be in a *inflationary* state, then the algorithm will decrease the target issuance rate of coins until the velocity recedes.
* **Issuance Rate has Rules (no discretionary policy-makers)**: can fluctuate between 1% and 20%. The maximum issuance rate (like Cosmos) is considered inflationary for cryptocurrency standards but it will only be reached as an initial rate for early adopters and under extreme conditions by the algorithm. 

## Research and the Future of Sharding

- Adaptative Sharding with Sharding Shuffling per Epoch (for example, daily):
  * Sharding by TPS: for example a maximum of 10 TPS per shard.
  * Sharding by Storage limit: for example a maximum 100MB per shard.
  * Sharding by Coins: for example a minimum of 0.5% staked and a maximum of 1% staked, per shard.
  * Both.
  * Shard that have too much stake can be splited, shards too little stake can be put together. A shard with too much stake is unbalacing, and too little is more easy to attack. For example, a shard with less than 0.5% of the stake can be joined with another shard to have more than 0.5% of the stake.
  * Our estimation is that with 100 or 200 shards you reach scalability.
  * With sharding attacks on one shard only affect the balances in that shard.



