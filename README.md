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
# Apply migrations
DATABASE_URL=db.db npx dbmate up
```

## Update `emoji.json`

```sh
node scripts/get-emoji.ts > src/utils/emoji.json
```

## Deployment

Moofy is hosted on the same web server as [web-server-2], so I'll assume it has been set up first (see "Setup" there).

[web-server-2]: https://github.com/SheepTester/web-server-2

1. ```sh
   pm2 start ecosystem.config.yml
   ```

1. ```sh
   pm2 startup
   ```

   This outputs a command. Copy paste and run it.

1. ```sh
   pm2 save
   ```

### Maintenance

```sh
# View past logs
pm2 logs --lines 100

# Real time logs
pm2 logs
```

If you update `ecosystem.config.yml`, run `pm2 reload ecosystem.config.yml`.

If you update `.env`, you can just run `pm2 reload floofy-bot`.
