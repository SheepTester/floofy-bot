# floofy-bot

A simple Discord bot made with Discord.js for personal use

## Use

Install dependencies:

```sh
npm install
# not necessary; free food-related components will fail gracefully
npx playwright install firefox
```

Create `.env` based on `.env.example`, then do

```sh
npm start
```

## Develop

```sh
# Build to JS for deployment (called automatically by `exeunt` command)
npm run build
# Auto-restart on code change
npm run dev
# Create a migration
npx dbmate new <migration-name>
# Apply migrations locally
DATABASE_URL=db.db npx dbmate up
```

## Update `emoji.json`

```sh
node scripts/get-emoji.ts > src/utils/emoji.json
```

## Install as a service

```sh
npm install -g node-windows
npm link node-windows
node scripts/create-windows-service.js
```

If Moofy's fallen and it can't get up, open the Windows "Services" app and look for "Floofy Bot." Its farts and noises are logged to Event Viewer.
