Soliton: The Web Blockchain
Browser client available
Web Browser P2P available (powered by Hyperhyperspace).
Browser client, with an external signalling server help, can become a peer in a gossip network of browsers.
Naive Key Storage in the Browser or in 3rd-party Encrypted Storage Services.
Single-threaded Mining with a Synthetic Nakamoto Consensus
VDF+VRF Consensus.
Fair staking in a single-threaded Nakamoto Consensus (synthetic)
Linear Integer Performance of CPUs

(https://preshing.com/20120208/a-look-back-at-single-threaded-cpu-performance/)

Stake delegation for convenience
Stake Delegation if you dont want to do Staking+Mining yourself. The stake must be locked to help the system know how much stake is at-stake on mining and consensus.
State-of-the-Art Tokenomics
Innovative Combination of Proven Tools: Algorihmic Monetary policy (no Governance) inspired by proven Tools of Monetary Policy and successful Proof-of-Stake blockchains cases like Cosmos Network with:
Minimum Stake Participation Rate at 10%: token issuance rate is increased in the extreme case where less than 10% of the tokens are staked. A minimum participation rate is central to security and stability of Proof-of-Stake protocols. This is the fraction of the total coins that is used in Consensus Mechanism of Proof-of-Stake.
Economic activity is measured by Velocity of Money: scientific research shows that for cryptocurrencies the velocity of money is best approximated with simple ratio of on-chain transaction volume to total coin supply (see Cryptocurrencies and the Velocity of Money by Pernice et al.). As we know, velocity of money is what mostly drives prices in a economy.
Velocity of Money Bands controls the Issuance Rate: a band of lower and upper velocities of money controls the issuance rate of the native coin. We cansider Proof-of-Stake blockchains coins similar to M2 supply in traditional economics because coins are unlocked and free to transfer and coins stake are also liquid because can be unstaked very quickly if delegated (see Velociy of Money for M2). For example, we can choose L = 6 and U = 8 to be annual lower and upper bounds on the velocity of money. If the current velocity of below L we can consider the network to be in a depressed state, then the consensu will increase the target issuance rate of coins until the velocity increases again. If the current velocity is above U we can consider the network to be in a inflationary state, then the algorithm will decrease the target issuance rate of coins until the velocity recedes.
Issuance Rate has Rules (no discretionary policy-makers): can fluctuate between 0.001% and 20%. The maximum issuance rate (like Cosmos) is considered inflationary for cryptocurrency standards but it will only be reached as an initial rate for early adopters and under extreme conditions by the algorithm. It can never reach 0% so miners always have rewards incentives to continue mining (plus the transactions fees that are not part of the issuance but is part of the total rewards the miners get).
Bootstrap Period with Virtual Balance on each Mining Thread: to avoid cold-start issues, each miner get and initial virtual drop for each thread mining, only during the bootstrap period of several months. For example if Alice is using only 1 thread to mine she gets 10,000 native coins to mine and if she mines 1 block she can get 10 coins as a reward. Then she has 10,000 virtual coins during the bootstrap and 10 real coins until she spends that or earn more mining rewards. During the boostrap period she can use 10,010 coins for staking. After the bootstratp period, for example 6 months, the virtual coins cannot be used for staking/rewards, but any real non-bootstrap remain and can used for staking in the future.
Type of Transactions
Core
transfer(to,amount): only if balance(sender) >= amount.
increaseAllowance(to,amount).
decreaseAllowance(to,amount).
transferFrom(from,to,amount): only if allowance(from,sender) >= amount.
stake(amount): moves to staked balance the amount of sender.
unstake(amount): this transaction frees the funds after 7 days.
Convenience
delegateStake(to,amount): moves to delegatedStake of to the amount of sender.
undelegateStake(to,amount): this transaction frees the funds after 7days.
delayedTransfer(to,amount,delay): lock amount until blocktime+delay seconds happens.
Advanced
lockedTransfer(to,amount,hash): lock amount until an unlock happens. Generates an unique txId.
unlockTransfer(txId,x,sig): only transfers txId.amount locked before if H(x) == txId.hash and if sender == txId.to.
lockTimedTransfer(to,amount,delay): lock amount until blocktime+delay seconds happens, then it expires. Generates an unique txId.
unlockTimedTransfer(txId,x,sig): only transfers txId.amount locked before time blocktime+delay and if sender == txId.to.
initMultiSig(n,[sign_1, ..., sign_n],m): makes sender address to become a multisig wallet with n signataries, and needing m signataries to validate a transfer.
multiSigTransfer(from,to,amount): if sender is in the list of signataries of multisig from then the signer is voting to execute the transfer, if #signers >= m then the transfer gets executed.
multiSigReset(from): for sender in the list of signataries, the resetting of the wallet is voted, if #signers >= m then all incomplete votings on the address from are removed.
References
Proof-of-Stake Longest Chain Protocols: Security vs Predictability https://arxiv.org/abs/1910.02218
Appendix A: FAQ
How can you use Longest-Chain like Nakamoto Consensus on a PoS blockchain? Are there formal barries to this?
There is a paper called Formal Barriers to Longest-Chain Proof-of-Stake Protocols describing limitations to Longest-Chain Fork-choice on Proof-of-Stake blockchains.
Technically we are using something we call Average Fastest Chain as a Fork-choice, then is not exactly Nakamoto Consensus’s Longest-Chain. We choose the change with the smallest average number of VDF steps per block. In the same line, this fork-choice if more difficult to attack with attacks of the type of NAME OF ATTACK FROM FEE-REGIME PAPER ATTACKS.

Appendix B: Research on the Future of Sharding
Adaptative Sharding with Sharding Shuffling per Epoch (for example, daily):
Sharding by TPS: for example a maximum of 10 TPS per shard.
Sharding by Storage limit: for example a maximum 100MB per shard.
Sharding by Coins: for example a minimum of 0.5% staked and a maximum of 1% staked, per shard.
Both.
Shard that have too much stake can be splited, shards too little stake can be put together. A shard with too much stake is unbalacing, and too little is more easy to attack. For example, a shard with less than 0.5% of the stake can be joined with another shard to have more than 0.5% of the stake.
Our estimation is that with 100 or 200 shards you reach scalability.
With sharding attacks on one shard only affect the balances in that shard.
Select a repo
