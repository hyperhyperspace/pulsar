# Specification for MiniComptroller Consensus Module

## Overview

The Vixify consensus protocol is a Proof-of-Stake system that uses a verifiable random function (VRF) and verifiable delay function (VDF) to achieve decentralization, fairness, and security. 

The key components are:

- **Proof-of-Stake:** The probability of block creation is proportional to the stake (coin balance) held by each participant. This allows anyone with coins to participate in consensus.
During the _Boostrap Period_ of the protocol all participants nodes have a fixed implicit virtual wallet balance that can be only used for staking but cannot be transferred.

- **Verifiable Random Function (VRF):** A cryptographic function that provides publicly verifiable proof that its output was generated randomly. This is used to select block creators randomly based on stake.

- **Verifiable Delay Function (VDF):** A function that takes a predictable amount of time to compute. This is used to introduce a delay in block creation that depends on a stakeholder's assigned difficulty.

- **Adaptive Difficulty:** The VDF difficulty is adjusted dynamically based on recent block times to target the desired average block time. Difficulty is assigned to each node based on stake.

- **Defenses:** The protocol is designed to mitigate various attacks like Sybil attacks, "Nothing-at-Stake", and "Winner-takes-all".

## Consensus Details

### Staking and Block Creation

- All addresses with a positive coin balance are eligible to participate in consensus and create blocks.

- The probability of being selected to create a block is proportional to the stake (coin balance) of each address.

- Selection of the next block creator depends on VRF output. The VRF takes the previous block hash as input.

- New blocks can only be created at discrete time intervals determined by the VDF. The required VDF difficulty determines this interval.

### VDF Difficulty and Adaptive Block Times

- The VDF difficulty assigned to each node determines the time interval for block creation. Higher difficulty means longer delay.

- The difficulty assigned to each node is based on its stake, determined pseudorandomly via VRF. Higher stake results in lower difficulty.

- The network maintains a target average block time, currently set at 40 seconds.

- The VDF difficulty is adjusted dynamically based on an exponential moving average of recent block times. This adapts the difficulty to target the desired block time.

- Difficulty is adjusted by the `blockTimeFactor` parameter, which is a ratio that modifies the baseline difficulty for all nodes.

- Upper and lower bounds on block times prevent extreme changes. The bounds are currently 1x to 1 billion x the target block time. 

### Block Rewards 

- Static block reward of 10 coins per block.

- During an initial bootstrap period, all nodes get a virtual stake bonus to ensure adequate decentralization.

Here is an improved explanation of the windowSize and speedRatio parameters:

### Finality and Reorgs

- The VDF speed ratio determines the depth of probabilistic finality. It represents how much slower the minimum speed nodes are compared to the maximum speed nodes.

- Blocks are considered finalized after they are buried by speedRatio + 1 number of confirmations.

- For example, if the speed ratio is 10x, blocks are final after 11 confirmations.

- This accounts for the maximum speed difference between nodes. Slower nodes cannot reorganizate the blockchain from more than `speedRatio` blocks back.

- The `speedRatio` can be between 1.3 and 6 currently.

- The `windowSize` parameter provides a moving average window to estimate the `speedRatio`. It is used to update the dynamic consensus parameters.

- By limiting reorgs to `speedRatio` blocks in the past, honest slower nodes have time to sync to the main chain before their blocks can be orphaned.

- The current `windowSize` of 180 blocks allows adequate time for an approx number of 180 nodes to participate and converge on the chain with most stake backing it.

- Therefore, `windowSize` acts as an upper bound on the number of active nodes that can meaningfully participate in consensus. 180 blocks corresponds to ~2 hours for typical target block times.

### Attack Resistance

- **Sybil Resistance** - VRF selection of block creators is based on stake not absolute number of nodes, preventing Sybil attacks.

- **Long-Range Attacks** - Recent blocks are finalized based on VDF delay, preventing long range reorgs.

- **Nothing-at-Stake** - Stake slashing for byzantine behavior is not implemented, but the impact is reduced by having limited block finality depth.

## Protocol Parameters 

The key parameters that control the consensus rules are:

- `targetBlockTime`: The target average block time. Currently set to 40 seconds.

- `windowSize`: The size of the moving average window, currently 180 blocks. Used to estimate dynamic parameters.

- `blockTimeFactor`: Adaptive ratio that modifies the baseline block creation difficulty. Initialized to `initialBlockTimeFactor`.

- `initialBlockTimeFactor`: The initial value for blockTimeFactor, currently 1080 (i.e. baseline difficulty). 

- `minBlockTimeFactor`: The minimum bound for blockTimeFactor, currently 1x the target.

- `maxBlockTimeFactor`: The maximum bound for blockTimeFactor, currently 1 billion x the target.

- `initialBlockReward`: The static block reward, currently set to 10 coins per block.

- `bootstrapPeriod`: The initial period when all nodes get a virtual stake bonus, currently set to 6 months.

- `movingMaxSpeed`: Exponential moving max window for VDF steps/second. Initialized to `initialMovingMaxSpeed`.

- `initialMovingMaxSpeed`: The initial value for movingMaxSpeed, currently set to 60 steps/second.

- `movingMinSpeed`: Exponential moving min window for VDF steps/second. Initialized to `initialMovingMinSpeed`. 

- `initialMovingMinSpeed`: The initial value for movingMinSpeed, currently set to 10 steps/second.

- `speedRatio`: The ratio between the max and min speed used to set node VDF difficulty.

- `noiseFraction`: Fraction of extra noise added to the VDF difficulty for randomness, currently 0.1. 

The initial values are set based on system modeling and should be tuned for different environments.

Additional details on the meaning and usage of each parameter is documented in the MiniComptroller.ts source code.

## Further Research

Some areas identified for further research and improvement:

- **Stake Slashing:** Add punishment of stakeholders who violate consensus rules to further disincentivize attacks.

- **Better Finality:** Use checkpoints or hierarchical VDFs to provide better finality guarantees. 

- **Fork Handling:** Explicit fork choice rules based on stake weight.

- **Better Sybil Resistance:** Use score based selection like Ouroboros Praos.

- **Economic Modeling:** Model the system economics and balance of incentives.

- **Security Proofs:** Provide formal proofs of attack resistance.

## References

- MiniComptroller.ts - Implementation prototype
- Scientific paper describing high-level protocol design

