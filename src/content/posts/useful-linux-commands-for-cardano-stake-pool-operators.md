---
title: "Useful Linux Commands for Cardano Stake Pool Operators"
slug: "useful-linux-commands-for-cardano-stake-pool-operators"
date: "2021-03-24"
categories: ["Stake Pool Operators"]
excerpt: ""
metaDescription: "Useful Linux Commands for Cardano Stake Pool Operators"
ogTitle: "Useful Linux Commands for Cardano Stake Pool Operators"
ogImage: "/uploads/2021/03/htop-800x413.png"
youtube: []
---
Here is a list of commands that you may find useful to help monitor your nodes of your stake pool.

## HTOP

If you have this installed, you can easily monitor the CPU & memory usage of all the processes on your server.

'htop' is a cross-platform ncurses-based process viewer. It is similar to 'top' but allows you to scroll vertically and horizontally, and interact using a pointing device (mouse).  You can observe all processes running on the system, along with their command-line arguments, as well as view them in a tree format, select multiple processes and acting on them all at once. Tasks related to processes (killing, renicing) can be done without entering their PIDs.

![](/uploads/2021/03/htop-800x413.png)

Screenshot of HTOP and all the processes running on a Cardano Stake Pool relay

You can see the PID, user, CPU percentage usage and memory percentage usage and kill off anything that seems to have gone astray.

## landscape-sysinfo

This is a quick command to see the basic system usage.

![](/uploads/2021/03/Screen-Shot-2021-03-24-at-9.31.14-pm.png)

landscape-sysinfo display on a Raspberry Pi

Important factors that you'd want to see at a glance include disk space usage, system load with 1 being a full CPU usage, temperature and memory usage. Since this server that I'm monitoring is a Raspberry Pi, it runs fairly hot and needs monitoring. The landscape-sysinfo command is also useful for getting the network IP address of the server.

## hostnamectl

Changing the host name of the server will ensure that you know which server you're logging into at a glance.

```
sudo hostnamectl set-hostname newNameHere
```

You'll need sudo permissions to set the new host name. Replace newNameHere with the desired name. I like to add the location as the name of the relay.

This document is continuously updated.
