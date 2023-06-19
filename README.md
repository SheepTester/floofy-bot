# floofy-bot

A simple Discord bot made with Discord.js for personal use

## Use

Edit `.env` per `.env.example`, then do

```sh
npm start
```

## Develop

```sh
npm run dev
npm run build
```

## Update `emoji.json`

```sh
deno run --allow-net=discord.com scripts/get-emoji.ts > src/utils/emoji.json
```

## Install as a service

```sh
npm install -g node-windows
npm link node-windows
node scripts/create-windows-service.js
```
