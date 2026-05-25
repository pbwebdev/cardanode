---
title: "EP016 - What Is A Decentralised Exchange? We're Helping You Understand"
slug: "ep016-what-is-a-decentralised-exchange"
date: "2021-07-13"
categories: ["Learn Cardano Podcast"]
excerpt: ""
metaDescription: "EP016 - What Is A Decentralised Exchange? We're Helping You Understand"
ogTitle: "EP016 - What Is A Decentralised Exchange? We're Helping You Understand"
ogImage: ""
youtube: ["https://www.youtube.com/embed/Uw8NuJLpOk4", "https://www.youtube.com/embed/hhBWZRiWnPw"]
---
<iframe class="podcast-embed" src="https://widget.spreaker.com/player?episode_id=45674632&theme=light&playlist=false&playlist-continuous=false&autoplay=false&live-autoplay=false&chapters-image=true&episode_image_position=right&hide-logo=false&hide-likes=false&hide-comments=false&hide-sharing=false&hide-download=true" width="100%" height="200" frameborder="0" loading="lazy"></iframe>

This week I explain what is a Decentralised Exchange (DEX) and I chat with Chris from Mirqur, a mathematically driven stake pool that he's been working for launch on Cardano with smart contracts.

## News

### MinSwap Fair Initial Stake Offering (FISO)

MinSwap team announce their "Fair Initial Stake Offering" FISO. This differs from others in that they will be selecting 30 small stake pools to help distribute their tokens to the network. These stake pools, from our understanding, will be selected randomly by the Minswap team. Users that delegate to these pools will gain MinSwap tokens as a reward.

The amount earned from this delegation is defined by a logarithmic formula in that the more you delegate, the less you will receive to a certain point. This is to stop large delegators from snapping up all of the tokens on the network.

https://twitter.com/MinswapDEX/status/1414670378056577024

The process and more information will be released on the 16th of July, 2021.

### Nami Wallet

A new wallet from one of the creators of SpaceBudz and the stake pool Berry Pool has released a new wallet. The wallet is called Nami Wallet and is very similar to that of MetaMask found on the Ethereum space.

The wallet allows for the usual basic functions that you would expect with the ability to create sub-accounts. Furthermore, you can also trigger a delegation function from a website. Thus, if you are on a website where this wallet is integrated, a user can click delegate, add in their wallet and quickly delegate to the pool of that website.

<iframe src="https://www.youtube.com/embed/hhBWZRiWnPw" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

It is a fast and clean user experience where it bypasses all of the confusing data that can be seen on many of the pool crawling websites.

## What Is A Decentralised Exchange

Listeners and views have been asking me what is a Decentralised Exchange. I may have missed clearly defining this before getting into the topic for the month. I had a [chat with Long from MinSwap](http://cardanode.com.au/ep014-cardano-decentralised-exchange-minswap/) initially about their DEX and how it works.

Decentralised exchanges are a great way to buy and sell cryptocurrencies. They differ greatly from centralised exchanges, where the crypto you are holding for trading actually comes directly from your wallet and isn't held by the exchange.

The decentralised exchange never holds a cryptocurrency. This means that there are no wallets to hack, no know your customer or anti-money laundering processes that need to be checked or

Combining a trusted identity system such as ATALA Prism to a decentralised exchange will help with future token offerings where customer identification is required.

### Automated Market Makers

An automated market maker can be found in decentralised exchanges. Automated market makers use a mathematical formula to determine the price of an asset.

In traditional centralised exchanges, the price is determined by order books of people wanting to buy and sell assets pairs at a certain price. The buy will set the price and amount of an asset they wish to buy and lock in the buying asset, e.g. USDT, while a seller would lock in their selling price and amount of asset such as ADA.

On these decentralised exchanges, the price is determined by the constant formulas implemented to track and manage the price of the trading pair.

Uniswap, the first decentralised exchange, has a straightforward formula to track the price of various tokens based on a constant.

```
x * y = k
```

X is one token in this simple formula, for example, Eth, and the other token Y can be any other ERC20 token. Multiplying the number of tokens together results in another number that remains a constant value for all trades on the pool.

As the value of X goes up, the value of Y will go down to keep the constant value K the same.

In a traditional centralised exchange, you require another party to buy or sell against the order that you place. So, for example, if you want to sell ADA at USD 1.30, you need another party willing to buy ADA at USD 1.30.

In an automated market maker, the trade is made to a smart contract, and the formula determines the price. So there doesn't need to be another party wanting to buy or sell against your order. It's called a peer to contract order or person to contract.

If there isn't a counterparty to trade against your order, where do the other cryptocurrencies you're ordering come from? This is where the idea of liquidity pools comes into play.

### Liquidity Pools

Liquidity providers are the ones that provide various cryptocurrencies in a liquidity pool in the form of trading pairs. As an incentive for providing liquidity to the pools, the liquidity providers get trading fees from the decentralised exchange.

A liquidity provider may provide the same amount of assets into a liquidity pool, for example, ADA/AGIX with a 50/50 split. If a buyer wanted to buy all of the AGIX tokens in the pool, it wouldn't be able to as the constant formula can't equal 0 because of the constant product formula x\*y = k.

Different decentralised exchanges provide different fee rewards as they are all competing for liquidity to offer better prices for trades with less slippage.

## What Is Impermanent Loss?

Impermanent loss happens when the ratio of the deposited tokens changes after they are deposited. The bigger the change, the bigger the loss. This is why trading pairs with low volatility are preferred, such as ETH/DAI.

Fees on the exchange offset these losses. Nevertheless, it's important to consider risks before depositing a trading pair.

On some decentralised exchanges, users are rewarded with an exchange token, such as Uniswap tokens, which can be sold, to offset losses.

## What Is Liquidity Mining?

Liquidity mining is a process on an AMM platform that provides an asset to a market to receive rewards denominated in the platform’s tokens. This technology is quite controversial since it has both an advantage and a drawback. There is a high risk of fluctuations in the price of provided assets. However, the benefit is obviously in the reward. The liquidity providers can sell the native tokens of the platform. 

## Pros & Cons of Automated Market Makers

We can’t definitely say whether AMMs are evil or good. However, there is a list of pros and cons to dot the i’s and cross the t’s. 

**Pros**

**Cons**

No KYC and need to register a special account

High risks of hacks and vulnerabilities

The way to launch a new token on the market

Money losses in case of impermanent loss

No middlemen

AMM stimulates Gas price

Decentralised exchanges that are built on Cardano can fix a lot of these issues that are considered cons.

The high risk of hacks and vulnerabilities comes from issues or vulnerabilities that exist in smart contracts. Many of these smart contracts are written for Ethereum in Solidity, and hackers are finding exploits that allow them to drain liquidity pools of all their assets.

-   [Hacker drains DeFi Liquidity Balancer](https://www.coindesk.com/hacker-drains-defi-liquidity-balancer)
-   [Chainswap Exploit Leads to Multi Millions Loss for DeFi tokens](https://decrypt.co/75698/chainswap-exploit-leads-to-multi-million-loss-for-defi-tokens)

Cardano is written in Haskell, a functional-based language that helps with the sanitisation of such contracts to ensure it does what is expected on execution. At the moment, the transaction fees on Cardano is barely noticeable at 0.14-0.17 ADA per transaction and with the ability to group transfers all into one transaction, such as sending multiple assets to multiple different addresses all in one transaction.

The impermanent loss will always be a risk, though.

Another factor to look at is Cardano's ERC20 converter, allowing users and decentralised exchanges to convert Ethereum based tokens into Cardano native assets where they could be traded on Cardano-based exchanges.

DeFi is hugely popular at the moment, but with the high gas prices to move assets and trade on Ethereum, it isn't worth it for someone dabbling in a decentralised exchange to want to understand how it works. Furthermore, when executing a smart contract can be hugely expensive.

Scalability is also an issue on Ethereum at the moment to only do 14 transactions per second. However, Cardano theoretically can scale up to 2000 transactions per second.

## Interview with Chris and Mirqur, the mathematically driven decentralised exchange on Cardano

<iframe src="https://www.youtube.com/embed/Uw8NuJLpOk4" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

Chris joins me on the podcast episode to chat about his project, Mirqur. He's spent the last 6 months perfecting this formula to balance liquidity pools for decentralised exchanges.

He goes through all the key features that make his pool a lot fairer and better sound than the other pools on the Cardano blockchain.

To find out more about the project, visit the [Mirqur](https://mirqur.io/) website, join their [Discord](https://discord.gg/ZqJnQPnHwa), follow them on [Twitter](https://twitter.com/Mirqurio) and subscribe to their sub-Reddit.
