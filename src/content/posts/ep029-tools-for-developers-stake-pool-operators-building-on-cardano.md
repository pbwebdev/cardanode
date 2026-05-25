---
title: "EP029 - Tools for Developers & Stake Pool Operators Building on Cardano"
slug: "ep029-tools-for-developers-stake-pool-operators-building-on-cardano"
date: "2021-10-20"
categories: ["Learn Cardano Podcast"]
excerpt: ""
metaDescription: "EP029 - Tools for Developers & Stake Pool Operators Building on Cardano"
ogTitle: "EP029 - Tools for Developers & Stake Pool Operators Building on Cardano"
ogImage: "/uploads/2021/10/Screen-Shot-2021-10-19-at-1.56.33-pm-800x273.png"
youtube: ["https://www.youtube.com/embed/JTDwguDoumE"]
---
\[spreaker type=player resource="episode\_id=47194034" width="100%" height="200px" theme="light" playlist="false" playlist-continuous="false" chapters-image="true" episode-image-position="right" hide-logo="false" hide-likes="false" hide-comments="false" hide-sharing="false" hide-download="true"\]

There are many tools, services and products being built at the moment to help support developers in the Cardano ecosystem.

As a developer, you might be used to packages to Software Development Kits (SDKs) that provide a base framework and standard to work against. They help speed up development and give you a consistent base to work against from project to project.

This is a list of services, tools and SDKs that we have come across and others should find useful.

.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; } .embed-container iframe, .embed-container object, .embed-container embed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

<iframe src="https://www.youtube.com/embed/JTDwguDoumE" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## BlockFrost

BlockFrost provides an API that allows developers to interact with the Cardano blockchain simply by RESTful API. It takes away all of the complexity of setting up all the aspects to talk to the blockchain direct.

We're using it to query wallet data and many projects use it for their NFT sales.

You can sign up for an account on BlockFrost, get your API keys and start using it for free.

BlockFrost even has API endpoints to store your data/NFT image on the InterPlanetary File Storage (IPFS) so that you can mint NFTs using their API.

Most traditional web developers build websites and services this way and are used to building websites in such a fashion. This is a logical step for any developer to start with if they're building a project on Cardano.

Furthermore, BlockFrost has a free tier that allows anyone to get started without having to pay for their services. As your application grows you will need to start looking at getting a paid account to be able to handle the requests.

What about the SDKs?

-   [https://github.com/blockfrost/blockfrost-js](https://github.com/blockfrost/blockfrost-js)
-   [https://github.com/blockfrost/blockfrost-dotnet](https://github.com/blockfrost/blockfrost-dotnet)
-   [https://github.com/blockfrost/blockfrost-python](https://github.com/blockfrost/blockfrost-python)
-   [https://github.com/blockfrost/blockfrost-swift](https://github.com/blockfrost/blockfrost-swift)

and many more

-   [https://github.com/orgs/blockfrost/repositories](https://github.com/orgs/blockfrost/repositories)

## Load Testing

If you're using this to do an NFT drop or 10,000 and you've done a lot of marketing, make sure you get the scaled-up plan as soon as possible and test the requests to ensure you can handle the traffic.

It is a good idea to test your website and infrastructure to ensure it can handle the load.

We like to use a service called Loadster which allows for the mimicking of users in a live environment.

![](/uploads/2021/10/Screen-Shot-2021-10-19-at-1.56.33-pm-800x273.png)

Test results from Loadster test with 10,000 unique users

You can record a users session performing various tasks on a website which can include all the actions a user would take to pay for a CNFT. You can then define how many users you want to have to interact with the website and how long you want to stress test the website and server over a period of time.

In our test, we ramped up the users in a 5 minute period where we it went from 0 users to 10,000 concurrent users. We then sustained the usage for 10 minutes before closing sessions down the users from 10,000 to 0.

The report will give you an idea of how much traffic the infrastructure can handle and any errors that might occur with full logs to view and analyse.

## TangoCrypto

![](/uploads/2021/10/tangocrypto-800x265.png)

TangoCrypto is a project similar to that of BlockFrost that allows you to interact with a Cardano node. It gives you more flexibility as it is more than just a REST API. It offers Webhooks, Email notifications, Websockets, Mobile push notifications, Apache Kafka, AWS Kinesis and many more. These services will allow you to constantly push data to a secondary source from the blockchain for secondary actions.

Simple things such as a payment notification to a wallet address can trigger a webhook, or email trigger to allow users to know of something happening on a wallet.

The downside is that the project is still under development. They currently have a [Project Catalyst proposal](https://cardano.ideascale.com/a/dtd/Software-as-a-Service-for-Cardano/366977-48088) in the works.

There is also an application development layer that will be built on the project with a suite of SDKs for developers.

## Heidrun

[![](/uploads/2021/10/heidrum-payment-wallet-info-800x573.png)](https://github.com/adosia/Heidrun)

Heidrum Wallet Information

[https://github.com/adosia/Heidrun](https://github.com/adosia/Heidrun)

If you want to create a faucet or even an initial coin offering, this could be a possible solution. Users can submit a transaction to a required address and based on the interaction, a response reaction can be performed such as distributing a native token to the sender's address.

## Toolkit for Cardano

[https://github.com/SundaeSwap-finance/toolkit-for-cardano](https://github.com/SundaeSwap-finance/toolkit-for-cardano)

This toolkit from the SundaeSwap team helps reduce the amount of code required for repeated tasks that might be done over and over again. Common tasks include:

-   Build Transactions
-   Sign Transactions
-   Submit Transactions
-   Mint Tokens
-   Create Wallet
-   Fund Wallet
-   Transfer Funds
-   Calculate Fees

Packaging these into nice shortcuts help reduce the amount of coding needed. Any type of shortcut is a good one.

## Guild Operators Suite

[https://developers.cardano.org/docs/operate-a-stake-pool/guild-ops-suite/](https://developers.cardano.org/docs/operate-a-stake-pool/guild-ops-suite/)

-   CNtools
-   gLiveView
-   Topology Updater

## PoolPerks

[https://poolperks.io/](https://poolperks.io/)

PoolPerks is a great tool for building 'perks' for your delegates. It's hard enough for small stake pool operators to attract delegates while fighting thousands of other pools for blocks.

PoolPerks gives your delegates a little extra reward for delegating to your pool. If a delegate is currently delegating to your pool, they can use the PoolPerks website to claim a perk that you may have assigned. It will cost the delegate a little ADA for the transaction but you will be able to claim the perk as a little thank you reward.
