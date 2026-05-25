---
title: "Reducing Cardano Transaction Times by Connecting CCVault or Nami to Daedalus Cardano Node"
slug: "reducing-transaction-connecting-nami-to-daedalus"
date: "2022-01-29"
categories: ["Daedalus", "NFT", "Wallets"]
excerpt: ""
metaDescription: "Reducing Cardano Transaction Times by Connecting CCVault or Nami to Daedalus Cardano Node"
ogTitle: "Reducing Cardano Transaction Times by Connecting CCVault or Nami to Daedalus Cardano Node"
ogImage: "/uploads/2022/01/ccvault-nami-to-daedalus-800x450.jpg"
youtube: ["https://www.youtube.com/embed/_-WDEaSnaWU", "https://www.youtube.com/embed/dpZX9eF9UUI", "https://youtu.be/sfLhNEtiktA"]
---
![Connect CCVault or Nami Wallet to Daedalus to speed up transactions](/uploads/2022/01/ccvault-nami-to-daedalus-800x450.jpg)

Connect CCVault or Nami Wallet to Daedalus to speed up transactions

This tutorial will show you how to connect CCVault to Daedalus or Nami to Daedalus to speed up your transaction wait time, bypass shared transaction servers on the network and submit your own transaction from your own Cardano node via Daedalus.

There are some clever ways to reduce Cardano transaction times and this is one technique that is fairly easy for a novice with some technical knowledge to be able to run their own Cardano node to be able to submit transactions directly without having to wait in line with everyone else.

Many users are reporting issues around mempool full or certain parts of the network being overloaded with transactions, there are ways around it all to help reduce the load.

In the lead up to the SundaeSwap decentralised exchange launch and the amount of NFT projects launching at the moment, we are seeing more and more transactions being queued up in the mempool of various wallets and services.

These mempools act as buckets of transactions with memory limits in regards to how many they can hold. They work as a first in first out process and as more and more people use wallets that rely on certain infrastructure, the more congested the wallet infrastructure becomes.

This method is one way to decentralise your dependence on these services and have your own Cardano node that will allow you to bypass various services and their mempool backlogs.

## How to Connect Nami to Daedalus or CCVault to Daedalus on Windows (Scroll to see Mac instructions)

Scroll down to see how to do it on a Mac.

<iframe src="https://www.youtube.com/embed/_-WDEaSnaWU" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Credits to Pernis Team

All this came about from a video post that the team from Pernis Token produced that talks about the process. Check out their [video](https://youtu.be/sfLhNEtiktA) on how to do it all.

## Solution: Connect Nami to Daedalus or CCVault to Daedalus

Nami Wallet is a great lightweight wallet that allows you to interact with decentralised applications (dApps) and participate in decentralised finance (DeFi) and much more.

Daedalus is a full node wallet, that is, it makes a copy of the blockchain locally on your computer and allows you to interact with the blockchain locally and submit transactions to it directly.

Combining the two and configuring Nami to connect directly to the Daedalus node means you can now have a web3 interface powered by your own Cardano node delivered by Daedalus. By not relying on third-party wallets servers, we can bypass the backlog of transactions that are filling up their mempools by the number of users that are using their services.

Teams are working out scaling solutions to improve the user experience. Everything from increasing the block size of the blockchain, to scaling of the servers that the wallets use, using different optimisation scripts for processing transactions and much more.

## How To Connect Nami to Daedalus or CCVault to Daedalus Cardano Node

The process is overall fairly easy and can be complete within 15 minutes if the Daedalus wallet is fully synced.

All the commands once you've downloaded all the files and config.

<iframe src="https://pastebin.com/embed_iframe/Rc5ZjZiJ" style="border:none;width:100%; height:600px;"></iframe>

### Download Daedalus and Install on Windows

Download and install Daedalus for Windows  
[https://daedaluswallet.io/](https://daedaluswallet.io/)  
  
Since it is a full node wallet, it will take some time to download a copy of the blockchain to your operating system. This step may take 24-36 hours to complete.

### Download the Windows Executable of Cardano Node

Go to [https://github.com/input-output-hk/cardano-node/](https://github.com/input-output-hk/cardano-node/)  
and download the Cardano Node Executable.  
  
It will take you to another website that is owned by IOHK where you can download the Windows version of the files.  
  
Extract this Zip file to your computer. In this demonstration, we are simply storing this in the Documents folder.  
  
**C:/Users/Peter-PC/Documents/Cardano-node-1.33.0/  
**  
\* Note: If you are using anti-virus software, it will pick up various files in the folder as being malicious and will remove them. This includes various libsom files which are needed to operate the node. Please restore and exclude these files from your antivirus software.  

### Download the Configuration Script

Now that you have the executable file, you will need the configuration file for the submit API.  
  
It can be downloaded from the same repository under Cardano-submit-api/config  
  
[https://github.com/input-output-hk/cardano-node/blob/master/cardano-submit-api/config/tx-submit-mainnet-config.yaml](https://github.com/input-output-hk/cardano-node/blob/master/cardano-submit-api/config/tx-submit-mainnet-config.yaml)  
  
Ensure that you are saving the raw YAML file to the same folder as where you have saved and extracted the Cardano node executable.  
  
[https://raw.githubusercontent.com/input-output-hk/cardano-node/master/cardano-submit-api/config/tx-submit-mainnet-config.yaml](https://raw.githubusercontent.com/input-output-hk/cardano-node/master/cardano-submit-api/config/tx-submit-mainnet-config.yaml)  
  
In our example, that is **C:/Users/Peter-PC/Documents/Cardano-node-1.33.0/**

### Ensure that Daedalus Is on and Synced

For any of the next steps to work, ensure that Daedalus is turned on and synced to the blockchain. If it isn't it will not work.

### Run These Commands in Powershell from the Cardano Executable Folder

Change directory to where you extracted the cardano node executable  
  
**cd ~/  
cd .\\Documents\\  
cd .\\cardano-node-1.33.0-win64\\  
**  
Run this command to set the environment variable to the socket path. We're setting this so we can set the submit API the details where Daedalus node is and can be accessed.  
  
**$ENV:CARDANO\_NODE\_SOCKET\_PATH = (Get-ChildItem \\\\.\\pipe\\ | Where-Object {$\_.name -like "cardano-node\*"}).FullName  
**  
Run this to check to see if the command worked.  
**$ENV:CARDANO\_NODE\_SOCKET\_PATH  
**  
You should see something like  
\\.\\pipe\\cardano-node-mainnet.12768.1  
  
Now execute the next command to start the Cardano Submit API  
**.\\cardano-submit-api.exe --mainnet --socket-path $ENV:CARDANO\_NODE\_SOCKET\_PATH --config .\\tx-submit-mainnet-config.yaml --port 8090  
**  
You should see  
Running server on 127.0.0.1:8090  
  
That will let you know that your local Cardano submit tx API is working.

### If you're using Nami Wallet - Connect Nami to the set custom node

Now that you have your local node setup, you can connect Nami wallet to it.  
  
Open Nami wallet.  
Click settings  
Choose Network  
Tick the option for Custom Node and enter in the address of your custom node.  
  
In this example we have  
  
**http://localhost:8090/api/submit/tx  
**  
Press Apply

### If you're using CCVault - Connecting the CCVault to Daedalus Configuration

Open CCVault, recommend you use the browser extension.  
  
1\. Click Preferences - Global Settings for the app  
2\. Enable the toggle switch for Custom Submit API Endpoint  
3\. Paste in your address of your newly created endpoint - http://localhost:8090/api/submit/tx  
  
Test that it is all working

### Testing your Transaction

Now that you have it all connected, it is best to test your setup.  
  
Click on your RECEIVE and copy your address. Click on your Send and paste in your receiving address.  
  
Send 1 ADA to yourself and test that it comes through.  
  
If it sends then you have successfully connected CCVault to Daedalus or Nami to Daedalus node and you're ready to use your Frankenstein wallet.

## Instructions for Connecting CCVault to Daedalus on Mac or Nami to Daedalus on a Mac

<iframe src="https://www.youtube.com/embed/dpZX9eF9UUI" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

<iframe src="https://pastebin.com/embed_iframe/c9dT2XMJ" style="border:none;width:100%;height:700px;margin:2em 0;"></iframe>

## You're Set! What is this Best For?

With this method, you'll be able to have the best of both worlds.

Daedalus has always been the best wallet for NFT drops as you had that open and constant connection to the blockchain but of course, Daedalus can't connect directly to dApps because it is a native application on your computer and not a browser extension.

[![](/uploads/2022/01/daedalus-nami-nft-drops-1-800x450.jpg)](https://bit.ly/34xqvI6)

Cardano NFT ADAWaifus.io

With this method, you can now have the best of both worlds. A constant connection to the blockchain that doesn't rely on third-party services and a wallet interface that allows you to connect to decentralised applications and participate in decentralised finance.

## Credits

All credits for this information go to [https://youtu.be/sfLhNEtiktA](https://youtu.be/sfLhNEtiktA) for posting the original tutorial and method for setup.
