# floofy-bot

A simple Discord bot made with Discord.js for personal use

## Use

Install dependencies:

```sh
npm install
# not necessary; free food-related components will fail gracefully
npx playwright install firefox
```

Edit `.env` per `.env.example`, then do

```sh
npm start
```

## Develop

```sh
# Build to JS for deployment
npm run build
# Build then run
npm run dev
```

## Update `emoji.json`

```sh
node scripts/get-emoji.mts > src/utils/emoji.json
```

## Install as a service

```sh
npm install -g node-windows
npm link node-windows
node scripts/create-windows-service.js
```
