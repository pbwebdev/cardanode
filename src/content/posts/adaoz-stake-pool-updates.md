---
title: "ADAOZ Stake Pool Updates"
slug: "adaoz-stake-pool-updates"
date: "2021-03-27"
categories: ["Stake Pool Updates"]
excerpt: ""
metaDescription: "ADAOZ Stake Pool Updates"
ogTitle: "ADAOZ Stake Pool Updates"
ogImage: ""
youtube: []
---
It's been an interesting month for the pool with delegation to it going up and down over the last 5 epochs. Currently, we have 9 delegators with a total stake of ~25,000 ADA.

I have moved the stake pool off AWS and have picked up two other cloud providers for the block producer node and the two main relays. The block producers resources have been increased on the new provider and the relay nodes are performing much better than they were on AWS.

I have also completed the first Raspberry Pi relay node for the pool and is located in my home on the Gold Coast. A second Raspberry Pi acts as a backup to the Block Producer node if it fails to respond.

The change up of the setup and cloud providers improved performance of the pool, ensures that the setup is completely distributed and risk adverse and finally reduces costs of operating the pool, especially when it isn't minting blocks yet.

In regards to minting blocks and producing rewards, we aren't there yet and in reality, since we are only at 25,000 ADA, we have less than a 3% changes of minting a block. It is possible, but highly not possible at the moment. I have monitored other pools that are around the same pledge and stake and others have been lucky enough to mint blocks.

## Grouped Delegation

I'm participating in a grouped delegation run by stake pool operators. A number of us are delegating all our ADA to a lead pool. This lead pool is rotated every 2 or so epochs to allow for the minting of blocks on that pool. So far the process is working but there is a long queue and will take months to get ADAOZ to the top of the list but there is time to burn. Runs very much like a Ponzi scheme. That is the only thing that is putting me off the entire process but it is working. The current pool in the delegation cycle is [LUCY](https://adapools.org/pool/79219df8a6919aa5443f301d07a6f9eb9be38a6388215baaf55291b3). Currently with 61 delegators and 740,000 ADA.

## Stake Pool Co-Owners Smart Contract

I'm looking at applying a smart contract to the variable fee reward for the pool. The contact will allow for the distribution of ADA from the rewards wallet to other owner wallets based on their percentage of stake in the pledge. The pools variable percentage fee will then be distributed to the addresses that are a part of the smart contract.

For example, if I and one other person both contribute 10,000 ADA, we both would have a 50% share in the pledge of the pool. When rewards are allocated to the rewards address, the contact will run and distribute the rewards to both myself and the other owner of the pool based on the percentage share of the pledge. This gives contributors to the pledge more rewards than what they would get if they were to simply delegate to the pool. The downside to this is that the ADA in the pledge that they allocate is locked in place and can only be moved by the operator, which is me. Complete trust needs to be involved.

There may be a factor added for the main pool operator to claim a certain percentage of the variable reward as an additional cost for the pool. For example, if the pool's variable rewards yield 100 ADA, the pool operator may have a 10% tax on that variable fee and claim an additional 10 ADA. The remaining 90 ADA is distributed to the pool owners including the pool operator that may have ADA staked as a pledge.

The other co-owners will also be requested to run a Raspberry Pi passive relay node for the pool to help with the distribution of the network and provide the block producer with more resilience and connection points to the rest of the network. I'll be providing the image for the pool to get up and running. This won't be a mandatory requirement but a suggestion to improve the stake pool since it also in their best interest.

The smart contract will be open source with the initial [repository created](https://github.com/pbwebdev/stake-pool-multi-owner-reward-distribution-contract) to mark the idea.

## Submission to IOHK's Pool Delegation Strategy

This is a long shot as there will be another 2000 or so pools submitting for the same thing. IOHK is currently rotating their delegation of ADA to 100 selected pools to help kick start them. Being on their delegation list will mean that the pool will receive a 3.2M delegation which will ensure block minting every epoch. There are key considerations to making it on the list which include:

-   Pools purpose: content, education, mission-driven, charity
-   Geographical location: located in un-represented areas of the world
-   Technical contribution: technical skills and length of time
-   Stake and pledge ratio: how much is being pledged on the server
-   Community engagement: how engaged is the stake pool operator

**Pool Purpose**: I'm meeting this consideration by creating valuable content. Long piece articles will be released over a weekend, usually, in a How-To or FAQ format.

**Geographical location**: This involves the strategy around co-owners and more off cloud, bare-metal servers on Raspberry Pis.

**Technical contribution**: I believe with the open-source smart contract contribution to the community, the length of time the pool is active and the technical setup of cloud and bare-metal servers will satisfy this criterion.

**Stake and pledge ratio**: I have more ADA that I'll be moving into the pool as soon as I can to increase this amount. If co-owners come on board, this will increase significantly.

**Community engagement**: All over it. Twitter, Facebook and LinkedIn. Also currently mentoring several people in setting up their own pools. They will come into the same issues as ADAOZ is experiencing.

## Podcast Initiatives

As some of you may know, I use to host and produce the Joomla Beat Podcast for many years and I've started the process of creating one for Cardano called Learn Cardano Podcast. It will be in a similar format to Joomla Beat on a weekly schedule, released every Tuesday night.

The first episode will be running a competition for listeners that delegate to support the pool. Listen to the first podcast episode for what that prize is.

## YouTube Channel

I've started doing video tutorials around various Cardano related topics. These will be released every Thursday night covering everything from how Stake Pools work, how to create a wallet to Plutus code and general activity in the Cardano space. I'm sure I'll get to the point where I'll be able to interview other developers, community members and leadership from the Cardano Foundation, IOHK or other commercial partners that are involved in the Cardano community.

## End of Month Stake Pool Catchups

This will be hosted live on YouTube every Friday night AEST. Thankfully daylight savings is ending on and the east coast of Australia will be back on the same timezone. This event will be late. Approximately 10pm on the last Friday of the month unless it needs shuffling. This will give everyone an update on the stake pool, marketing efforts and allow anyone to ask questions related to the pool or Cardano.
