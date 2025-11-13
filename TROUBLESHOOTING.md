# Troubleshooting Guide - Products Not Showing

## Issue: Products are in database but not displayed on website

### Root Causes & Solutions

#### 1. **Server Not Running** ❌

If products don't show, first check if the server is running:

```powershell
npm start
```

Expected output:

```
✅ Connected to SQLite database.
✅ Products table created or already exists.
🚀 Server running at http://localhost:3000
🤖 Telegram bot is polling...
```

#### 2. **Database Issues** 🔍

Check if products exist in database:

```powershell
node -e "const Database = require('better-sqlite3'); const db = new Database('./database.db'); const stmt = db.prepare('SELECT * FROM products'); const rows = stmt.all(); console.log(JSON.stringify(rows, null, 2));"
```

Expected output: Array of products with fields: id, name, price, image, weight

#### 3. **API Endpoint Not Working** 🔌

Test the API directly:

```powershell
curl http://localhost:3000/api/products
```

Or open in browser:

```
http://localhost:3000/api/products
```

Should return JSON array of products.

#### 4. **Frontend Not Loading Products** 🌐

Open browser console (F12 → Console tab) and look for:

- ✅ `✅ Parsed products: [...]` - Products loaded successfully
- ❌ `Error fetching products:` - API fetch failed
- ❌ `No products returned from API` - Empty array returned

#### 5. **Image Paths Incorrect** 🖼️

Check browser Network tab (F12 → Network):

- Images should be requested from: `/rijng.webp`, `/necklace.jpg`, etc.
- If images show 404 errors, the path is wrong
- Images are stored in `public/` folder and served at root `/`

### Browser Developer Tools (F12)

**Check Console for errors:**

1. Press `F12`
2. Go to **Console** tab
3. Refresh page
4. Look for any red error messages

**Check Network requests:**

1. Press `F12`
2. Go to **Network** tab
3. Refresh page
4. Filter by "XHR" (XMLHttpRequest)
5. Look for `/api/products` request
6. Check Response to see if products are there

### Step-by-Step Verification

1. **Start server:**

   ```powershell
   npm start
   ```

2. **Check database has products:**

   ```powershell
   node -e "const Database = require('better-sqlite3'); const db = new Database('./database.db'); console.log(db.prepare('SELECT COUNT(*) as count FROM products').get());"
   ```

3. **Test API:**
   Visit `http://localhost:3000/api/products` in browser

   - Should see JSON array
   - Each product should have: id, name, price, image (with `/` prefix), weight

4. **Open frontend:**
   Visit `http://localhost:3000` in browser

   - Open browser console (F12)
   - Look for logs:
     - `🔄 Page loaded, initializing...`
     - `✅ Parsed products: [...]`
     - `🔄 Loading X products`

5. **Check images load:**
   - Open Network tab (F12 → Network)
   - All images should show in list (rijng.webp, necklace.jpg, etc.)
   - Status should be `200 OK`

### Common Issues & Fixes

| Problem                                    | Solution                                                   |
| ------------------------------------------ | ---------------------------------------------------------- |
| Products in DB but not showing             | Check if server is running at port 3000                    |
| API returns empty array                    | Check database isn't corrupted, run initial data insertion |
| Images show 404                            | Ensure images exist in `public/` folder                    |
| "Can't connect to server"                  | Make sure `npm start` is running without errors            |
| Products sometimes appear, sometimes don't | Could be multiple bot instances causing conflicts          |

### Reset Everything

If nothing works, reset the database:

```powershell
# Stop the server (Ctrl+C)
# Delete database
Remove-Item database.db

# Start server (will recreate database with initial data)
npm start
```

### Need More Help?

Check the logs in the terminal where `npm start` is running:

- Look for `📦 Fetched products:` - shows what the API returns
- Look for any `Error` messages
- Look for CORS or network errors

If you see products in the API endpoint (`http://localhost:3000/api/products`) but not on the website, it's a frontend JavaScript issue - check browser console (F12).
