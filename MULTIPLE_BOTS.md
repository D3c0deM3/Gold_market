# How to Use Multiple Bot Tokens

## Problem
You can only have ONE bot instance polling per token. If you run both local and production with the same token, you get the 409 Conflict error.

## Solution: Use Different Tokens for Each Environment

### Step 1: Create a Development Bot
1. Open Telegram
2. Message `@BotFather`
3. Send `/newbot`
4. Follow prompts to create a new bot
5. Copy the token (e.g., `YOUR_DEV_BOT_TOKEN`)

### Step 2: Configure Local Development
Update `.env`:
```
BOT_TOKEN=YOUR_DEV_BOT_TOKEN
PORT=3000
```

### Step 3: Configure Production (Render)
1. Go to https://render.com/dashboard
2. Click **gold-market** service
3. Go to **Environment** tab
4. Update `BOT_TOKEN` to your **PRODUCTION bot token** (the new one)
5. Save and redeploy

### Now You Can Run Both:
- **Local:** `npm start` (uses DEV bot token)
- **Production:** Render automatically polls (uses PROD bot token)
- ✅ No conflicts!

## Current Setup (Production Bot)
Your production bot token: `8549486337:AAEk0SOdEZ1Am13alrpYFegj-0S-uUtqbTo`

To use only production (recommended for now):
- ❌ Do NOT run `npm start` locally
- ✅ Only Render will be running with the production bot
