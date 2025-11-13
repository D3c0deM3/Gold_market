# Deployment Guide - Gold Market

## Platform Comparison

| Platform | Suitable? | Reason |
|----------|-----------|--------|
| **Netlify** | ❌ NO | Static sites only - no Node.js backend |
| **Vercel** | ⚠️ PARTIAL | Better for serverless functions, not ideal for continuous polling |
| **Render** | ✅ YES | Perfect for Node.js apps with persistent processes |
| **Heroku** | ✅ YES | Good alternative (paid) |
| **Railway** | ✅ YES | Good alternative |

## Recommended: Deploy on Render.com

### Prerequisites
1. GitHub account with your code pushed
2. Render.com account (free tier available)

### Step-by-Step Deployment

#### 1. Push to GitHub
```powershell
git add .
git commit -m "Add environment configuration for deployment"
git push origin master
```

#### 2. Go to Render.com
- Visit https://render.com
- Sign up with GitHub

#### 3. Create New Web Service
- Click "New +" → "Web Service"
- Connect your GitHub account
- Select your `Gold_market` repository
- Select the `master` branch

#### 4. Configure Deployment
- **Name:** gold-market
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free (or paid for more resources)

#### 5. Add Environment Variables
In the Render dashboard, add:
- **Key:** `BOT_TOKEN`
- **Value:** `7593096494:AAG7GWaVEPgeVSpWbSuZQzTJAJsfLtb48PA`

#### 6. Deploy
Click "Deploy" and wait for it to finish!

Your app will be available at: `https://gold-market.onrender.com`

### Test Your Deployment
- Visit: `https://gold-market.onrender.com` (frontend)
- Check API: `https://gold-market.onrender.com/api/products`

## ⚠️ Important: Telegram Bot Polling Conflicts

The app uses Telegram bot **polling** which connects to Telegram to get updates. Telegram only allows **ONE active connection per bot token at a time**.

### Common Error:
```
ETELEGRAM: 409 Conflict: terminated by other getUpdates request; 
make sure that only one bot instance is running
```

### Solutions:

#### Option 1: Run EITHER Local OR Render (Not Both)
- Stop local app before deploying to Render
- Stop Render before running locally

```powershell
# Kill all Node processes on Windows
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

#### Option 2: Use Two Different Bot Tokens (Recommended for Development)
Create separate bots for development and production:

1. **Production Bot** (use on Render):
   - Token: `7593096494:AAG7GWaVEPgeVSpWbSuZQzTJAJsfLtb48PA`
   - In Render env: `BOT_TOKEN=7593096494:AAG7GWaVEPgeVSpWbSuZQzTJAJsfLtb48PA`

2. **Development Bot** (use locally):
   - Create a new bot: Talk to `@BotFather` on Telegram → `/newbot`
   - Get your token
   - In `.env`: `BOT_TOKEN=YOUR_LOCAL_BOT_TOKEN`

This way you can run both local and production simultaneously without conflicts!

## Important Notes

### ⚠️ Database Persistence
SQLite (`database.db`) is stored in the container's ephemeral storage. On Render's free tier:
- Database will be **reset when the service restarts**
- For production, consider:
  - **Option 1:** Use PostgreSQL (Render provides free database)
  - **Option 2:** Use MongoDB Atlas (free tier)
  - **Option 3:** Upgrade to Render's paid plan with persistent disk

### ⚠️ Telegram Bot Webhook vs Polling
Current setup uses **polling** (asking for updates). On production:
- Polling keeps a continuous connection
- May cause issues on platforms with connection limits
- Consider switching to **webhooks** if you face connection issues

### ⚠️ Security
- ✅ BOT_TOKEN is now in environment variables (safe)
- `.env` is in `.gitignore` (won't be pushed to GitHub)
- Never commit sensitive secrets to GitHub

## Alternative: Database Upgrade

If you want persistent database on Render's free tier, modify to use PostgreSQL:

```javascript
// Replace SQLite with PostgreSQL
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
```

Then in Render dashboard, attach a free PostgreSQL database.

## Summary of Changes Made
- ✅ Created `app.js` - combined bot and server
- ✅ Updated `package.json` - changed main entry point
- ✅ Added `dotenv` - for environment variables
- ✅ Created `render.yaml` - Render deployment config
- ✅ Created `.gitignore` - protect sensitive files
- ✅ Created `.env` - local development config
- ✅ Secured BOT_TOKEN - uses environment variables

## Need Help?
- Render Docs: https://render.com/docs
- Node.js Deployment: https://nodejs.org/en/docs/guides/nodejs-web-app/
