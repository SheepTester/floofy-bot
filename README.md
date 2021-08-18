# floofy-bot

A simple Discord bot made with Discord.js for personal use

## Use

Edit `.env` per `.env.example`, then do

```sh
npm start
```

## Update `emoji.json`

```sh
deno run --allow-net=discord.com --allow-write=./src/emoji.json scripts/get-emoji.ts
```

## Install as a service

```sh
npm install -g node-windows
npm link node-windows
node scripts/create-windows-service.js
```
