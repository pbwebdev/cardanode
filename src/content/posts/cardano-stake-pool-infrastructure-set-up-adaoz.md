---
title: "Simple & Easy Cardano Stake Pool Infrastructure"
slug: "cardano-stake-pool-infrastructure-set-up-adaoz"
date: "2021-03-02"
categories: ["Stake Pool Updates"]
excerpt: ""
metaDescription: "Simple & Easy Cardano Stake Pool Infrastructure"
ogTitle: "Simple & Easy Cardano Stake Pool Infrastructure"
ogImage: "/uploads/2021/03/aws-setup-800x667.png"
youtube: ["https://www.youtube.com/edengardenpool"]
---
This is a general overview of our Cardano stake pool infrastructure for ADAOZ Australian stake pool on AWS.

Table Of Contents

-   [1\. Our Cardano Stake Pool Infrastructure](#1-our-cardano-stake-pool-infrastructure)
-   [2\. Stake Pool Instance Configuration](#2-stake-pool-instance-configuration)
-   [3\. Want to See Our Relay and Block Producer Monitoring Stats?](#3-want-to-see-our-relay-and-block-producer-monitoring-stats)

-   [Direct Links to Our Cardano Node Monitors](#direct-links-to-our-cardano-node-monitors)

-   [4\. Useful Guides That We Followed](#4-useful-guides-that-we-followed)

A good setup is important for security, uptime and performance. Getting this right takes time, tweaking and the general know-how and expertise to run and manage it all. Fortunately, I and other team members of my Company have been working extensively with AWS cloud infrastructure for the past few years when it comes to hosting and managing our own clients.

When it came to setting up a Cardano stake pool, it all made sense and the process was all quite simple with our level of experience.

This is a broad overview of our AWS setup, without giving too much away.

## 1\. Our Cardano Stake Pool Infrastructure

![Cardano stake pool infrastructure set up](/uploads/2021/03/aws-setup-800x667.png)

AWS Stake Pool Infrastructure Setup

Firstly, all traffic that comes into our Cardano Stake Pool infrastructure comes in via the AWS Load Balancer. The load balancer is set up to only accept traffic via one single port, which relates to the Cardano port for the relay. This ensures the publicly accessible subdomain, relay1.cardanode.com.au, for the relay isn't accessed on any other ports. One single TCP port for one single reason.

Behind the load balancer, we have configured an auto-healing launch configuration that allows for multiple relays to be spun up in the event of a failure to the primary relay. The helps with redundancy by ensuring that relay1 is always up if there is an issue.

In the future, the load balancer will point to additional relays. As the pool grows in size and starts producing blocks, we'll need to ensure continuous connection to the Block Producer node.

The instances set up in a Virtual Private Cloud. It allows us to connect the Relay with the Block Producer directly within its own private network. The Producer Node is never to have access to the public internet with no external traffic going in or out from it. The connection is direct to the Relay node.

Each of the nodes have their own security policies ensuring granular security control.

## 2\. Stake Pool Instance Configuration

The instances themselves are security-hardened with an amount of security that makes it incredibly annoying to log into the servers.

Relay topology is automated on an hourly basis with a selection of key relay nodes paired to our relay for a fast connection.

Monitoring tools that we are using on the servers include Prometheus and Grafana. Both are standard for all Cardano stake pools.

## 3\. Want to See Our Relay and Block Producer Monitoring Stats?

We've made our monitoring stats completely public. You can access them via [ADAPools.org](https://adapools.org/adaoz) by searching for our stake pool, ADAOZ.

We believe in transparency with our stake pool. If we've stuffed up in managing it, and failed to produce a block, these screens will verify that fact and hold us accountable.

![](/uploads/2021/03/adapools-relay-stats-800x406.png)

ADAOZ pool stats on ADAPools.org

### Direct Links to Our Cardano Node Monitors

-   [Relay monitoring stats](https://adapools.org/connect/00e4afa2ad6cc9ec1fb4db5714384ed9)
-   [Producer node monitoring stats](https://adapools.org/connect/4b3a7e3ffc5c82444fb892496408e8d7)

## 4\. Useful Guides That We Followed

All of these guides do things in slightly different ways. If you're thinking about starting your own stake pool, I highly recommend going through all of them with the main Cardano one as the first one that you do to understand how it all is suppose to be connected and works.

What these guides don't go through is the stake pool infrastructure setup and security that can be applied on the AWS infrastructure level.

If you can follow and understand the process from the [main Cardano documentation](https://docs.cardano.org/en/latest/getting-started/stake-pool-operators/), then you'll be able to follow the guides and tools from all the other tutorials which make some of the core steps a little easier but it is important to understand the underlying workflow behind it all to be able to debug issues you may come across.

-   [https://docs.cardano.org/en/latest/getting-started/stake-pool-operators/](https://docs.cardano.org/en/latest/getting-started/stake-pool-operators/ )
-   [https://www.coincashew.com/coins/overview-ada/guide-how-to-build-a-haskell-stakepool-node](https://www.coincashew.com/coins/overview-ada/guide-how-to-build-a-haskell-stakepool-node )
-   [https://cardano-node-installation.stakepool247.eu/](https://cardano-node-installation.stakepool247.eu/ )
-   [https://cardano-community.github.io/guild-operators/#/README](https://cardano-community.github.io/guild-operators/#/README )
-   [https://forum.cardano.org/t/how-to-set-up-a-pool-in-a-few-minutes-and-register-using-cntools/48767](https://forum.cardano.org/t/how-to-set-up-a-pool-in-a-few-minutes-and-register-using-cntools/48767)
-   [https://www.youtube.com/edengardenpool](https://www.youtube.com/edengardenpool)
