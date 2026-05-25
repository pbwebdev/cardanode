---
title: "Cardano Stake Pool Margin Fee Change to 0.5%"
slug: "cardano-stake-pool-margin-fee-change-to-0-5"
date: "2022-01-02"
categories: ["Stake Pool Updates"]
excerpt: ""
metaDescription: "Cardano Stake Pool Margin Fee Change to 0.5%"
ogTitle: "Cardano Stake Pool Margin Fee Change to 0.5%"
ogImage: ""
youtube: []
---
From time to time, our Cardano stake pool margin fee will change. The core team had a vote last week to adjust the fee structure of the ADAOZ stake pool.

Currently, our Cardano stake pool margin fee is set to 0%. We had changed this back in July 2021 (2021-07-15 10:35:21) to compensate for a loss of an epoch reward (epoch 276) where our changes to the pool pledge caused it to not have any rewards.

Since then the lost rewards have been recovered and our delegates compensated for new delegates enjoying the slight boost in rewards being set at 0%.

## Increase in the Cardano Stake Pool Margin Fee and Schedule Change

We are going to update the fee schedule to the new schedule as follows:

-   0.5% at 5M-10M total delegation
-   10M-15M ADA = 1% fee
-   15M-20M ADA = 2% fee
-   20M ADA = 3% fee

As the pool's total delegation changes, we will update and increase the fees making the margin fee variable to the total delegation of the pool. This has always been the case but we have adjusted the points when the fees will change and limited it to 3% for the time.

We also introduced the 0.5% fee for the delegation-level between 5M-10M ADA delegation.

The Alonzo era bringing smart contracts to Cardano also has increased the general costs of the server environments. Future redundancies will also need to be implemented as the pool grows and the team will need to be able to support and grow the stake pool.

We have a lot of plans for 2022. We're going to be quite busy.

## When Will the Increase of the Cardano Stake Pool Margin Fee Start?

The fee increase from 0% to 0.5% has already been implemented on our pool and will become active in Epoch 315 Jan 16th 21:45:00 UTC.

The total ADA that is in our pool at that point in time will have the 0.5% fee charged to the total rewards that are distributed to our pool.

## What is the Cardano Stake Pool Margin Fee?

There are two types of fees on a Cardano stake pool. There is the 340 ADA fixed fee which is set by the protocol and the variable margin fee which is set by the pool operator. This variable fee is usually set anywhere between 0%-10%.

Every epoch, rewards are distributed to a pool and then divided to all the delegates in proportion to their total delegation.

Fees are taken out of the total rewards that are distributed to a stake pool, not directly from your rewards or wallet.

## How Does the Cardano Stake Pool Margin Fee Effect My rewards?

The fees are taken out of the collective distribution of rewards to the pool.

At the end of each epoch when rewards are calculated and distributed, the fixed and margin fee is taken out of the total rewards and distributed to the pool owner. The rest is distributed to the pool delegates.

If a pool is given 10,000 ADA as pool rewards and the fee is set to zero, the pool owner will get 340 ADA and the rest of the delegates will get 9,760 ADA.

If the fee is increased, the margin fee is removed from the remaining 9,760 ADA.

9760\*0.05 = 48.8 ADA.

Therefore, the pool owner will get 340+48.8 = 388.8 ADA

The remaining 9,711.2 ADA is then distributed to the rest of the delegates

The difference for the delegates is minimal, the difference for the pool operator is much more substantial as an extra 50 ADA at today's current price can add to infrastructure costs and development of the protocol.
