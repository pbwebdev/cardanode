---
title: "ADA Rewards Have Disappeared from Yoroi Wallet"
slug: "ada-rewards-disappeared-from-yoroi-wallet"
date: "2021-10-01"
categories: ["Staking", "Yoroi"]
excerpt: ""
metaDescription: "ADA Rewards Have Disappeared from Yoroi Wallet"
ogTitle: "ADA Rewards Have Disappeared from Yoroi Wallet"
ogImage: ""
youtube: ["https://www.youtube.com/embed/xcECPya1lWY"]
---
Many users have reported that their ADA rewards have disappeared!

There have been issues with a tool called **[DBSync](https://github.com/input-output-hk/cardano-db-sync)** that many Cardano tools and wallet providers rely on to display data about the blockchain. This data includes the rewards that a pool may generate for its delegates or the rewards for a particular wallet.

As a result of this bug, the data that is coming through sometimes needs to be recalculated or reimported into the database for the wallets to access.

## What is DB Sync?

The purpose of Cardano DB Sync is to follow the Cardano chain and take information from the chain and an internally maintained copy of the ledger state. Data is then extracted from the chain and inserted into a PostgreSQL database. SQL queries can then be written directly against the database schema or as queries embedded in any language with libraries for interacting with an SQL database.

Once all the data is in a useable database, websites and third-party applications can easily tap into the information and display it in useful and creative ways.

## Yoroi wallet: "Due to Protocol Update, the Rewards are Being Recalculated"

These updates happen from time to time and as a result, the rewards data disappears and reappears or is inaccurate and needs to be recalculated for accuracy.

For some periods, we had seen a delay of data from up to 3 days while the data syncs occurred.

## Why Were the Yoroi Rewards Graphs Removed?

From a pool operator's point of view, having the rewards data missing from the pool's page or missing from your delegates rewards screens is detrimental to the pool. If the delegate isn't connected with the operator, the first assumption is that the operator has missed blocks or stuffed up the rewards for the pool, hence there are no rewards coming through.

Removing all the data together from the interface rather than showing incorrect data is a better situation for both the delegate and the pool operator.

## Alternative Ways to See Your Cardano Staking Rewards If Your Yoroi ADA Rewards Have Disappeared

One of the easiest ways to look up your wallet rewards is to use the website PoolTool.io. It allows you to not only track all of your rewards but also to download your data for tax purposes.

https://www.youtube.com/embed/xcECPya1lWY

## Get Your Public Staking Key in Yoroi

Load the Yoroi Extension  
Click on "Receive"  
From the left-hand side menu, choose "Reward"  
Copy this Stake Key

## Find Your Wallet on PoolTool.io

From the home page of the [PoolTool.io](https://PoolTool.io) website,  
Click "Rewards data for taxes" button  
Paste in your staking key and press the search icon  
Press the blue arrow to load your wallet

## Analyse your Cardano ADA Rewards on PoolTool.io

Enjoy and understand your rewards.

## Learn More

Learn [how to stake your ADA on Yoroi](http://cardanode.com.au/delegate-stake-ada-on-yoroi-stake-pool/).
