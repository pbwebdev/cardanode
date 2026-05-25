---
title: "5 News Relays for Our Cardano Stake Pool"
slug: "2-new-relays-for-our-cardano-stake-pool"
date: "2021-03-09"
categories: ["Stake Pool Updates"]
excerpt: ""
metaDescription: "5 News Relays for Our Cardano Stake Pool"
ogTitle: "5 News Relays for Our Cardano Stake Pool"
ogImage: "/uploads/2021/03/raspberry-pi-cardano-800x533.jpg"
youtube: []
---
Our Cardano stake pool ensures optimal communication between our block producing node (the server that creates blocks and we are rewarded for) and the rest of the Cardano network, we have created and launched additional relays across multiple different cloud providers including Digital Ocean, Amazon Web Services and Linode.

Launching the additional Cardano relays in different geographical locations in the world on a different cloud provider ensures that we will always have a connection and be more distributed to different "corners" of the globe.

We have our relays in Australia, South East Asia, Japan, Europe and the United States.

## Current Cardano Stake Pool Configuration

Our current and main relay setup comprises a mix of cloud infrastructure providers. This helps us decentralise our setup and reliance on one single provider in the event of major provider outages.

With an additional fallback to bare metal relay and block producer servers in the event of outages from our cloud providers, our Cardano stake pool ADAOZ can ensure uptime to continuously produce blocks and verify the network.

## Previous Cardano Stake Pool Set Up

Previously, at times, we noticed performance issues on our initial AWS relay node with excessive memory usage at times or excessive connections to it from other relays on the network (find out more about our [Cardano Stake Pool infrastructure set up on AWS](http://cardanode.com.au/cardano-stake-pool-infrastructure-set-up-adaoz/)).

We optimised the node, restricted connections but at times it would become unresponsive for up to periods of 10 minutes before we could rectify the issue. It was still communicating to our block producer and the network but it did make us nervous. If it was our time to actually produce blocks, I would have been worried.

Creating the new additional relays ensures our block producing node always has a connection to the network.

In addition to this, we put redundancies in place in case we need to move and migrate our block producer node to a different hosting provider. We have alternatives on three different cloud providers and soon, our low power bare-metal set up using Raspberry Pis which we should be able to run partially on solar power. This will be an exciting and very geeky addition to our Cardano stake pool.

![Raspberry Pi Cardano stake pool](/uploads/2021/03/raspberry-pi-cardano-800x533.jpg)

Beautiful Cardano Stake Pool set up on Raspberry Pis by https://www.adamantium.online/

Some have said it is excessive and really isn't needed but we'll assess the performance of the pool and make changes in the future accordingly as needs change and the Cardano network upgrades.

You can find out more information about Cardano Stake Pool performance stats our pool on [ADAPools.org/ADAOZ](https://ADAPools.org/ADAOZ)
