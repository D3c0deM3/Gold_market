require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ============================================
// CONFIGURATION
// ============================================
const BOT_TOKEN =
  process.env.BOT_TOKEN || "8549486337:AAEk0SOdEZ1Am13alrpYFegj-0S-uUtqbTo";
const PUBLIC_DIR = path.join(__dirname, "public");
const port = process.env.PORT || 3000;

// ============================================
// EXPRESS APP SETUP
// ============================================
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "public/images")));

// ============================================
// TELEGRAM BOT SETUP
// ============================================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Handle bot polling errors
bot.on("polling_error", (err) => {
  if (err.code === "ETELEGRAM") {
    console.error("❌ Telegram Bot Error:", err.message);
    if (err.message.includes("409 Conflict")) {
      console.error("⚠️  Multiple bot instances detected!");
      console.error("💡 Make sure only ONE instance is running at a time.");
      console.error("   - Stop local app before deploying to Render");
      console.error(
        "   - Or use different BOT_TOKEN for development vs production"
      );
    }
  } else {
    console.error("❌ Polling error:", err);
  }
});

bot.on("error", (err) => {
  console.error("❌ Bot error:", err);
});

// ============================================
// ENSURE PUBLIC DIRECTORY EXISTS
// ============================================
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// ============================================
// DATABASE CONNECTION
// ============================================
let db;
try {
  db = new Database("./database.db");
  console.log("✅ Connected to SQLite database.");

  // Create products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      weight REAL NOT NULL
    )
  `);
  console.log("✅ Products table created or already exists.");

  // Initial data insertion (only if table is empty)
  const countResult = db
    .prepare("SELECT COUNT(*) as count FROM products")
    .get();

  if (countResult.count === 0) {
    const initialProducts = [
      { name: "Gold Ring", price: 500, image: "rijng.webp", weight: 300 },
      {
        name: "Luxury Necklace",
        price: 1200,
        image: "necklace.jpg",
        weight: 250,
      },
      {
        name: "Golden Bracelet",
        price: 850,
        image: "goldenbraslet.avif",
        weight: 500,
      },
      {
        name: "Gold Earrings",
        price: 1500,
        image: "goldearings.jpg",
        weight: 100,
      },
    ];

    const insertStmt = db.prepare(
      "INSERT INTO products (name, price, image, weight) VALUES (?, ?, ?, ?)"
    );

    initialProducts.forEach((product) => {
      try {
        insertStmt.run(
          product.name,
          product.price,
          product.image,
          product.weight
        );
        console.log(`✅ Inserted ${product.name} into products table.`);
      } catch (err) {
        console.error("Error inserting initial data:", err.message);
      }
    });
  } else {
    console.log("✅ Products table already contains data.");
  }
} catch (error) {
  console.error("Error connecting to database:", error.message);
  process.exit(1);
}

// ============================================
// TELEGRAM BOT - USER SESSIONS
// ============================================
const userSessions = {};

// ============================================
// TELEGRAM BOT - COMMAND: /addproduct
// ============================================
bot.onText(/\/addproduct/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = { step: "name" };
  bot.sendMessage(chatId, "Enter the product name:");
});

// ============================================
// TELEGRAM BOT - HANDLE TEXT MESSAGES FOR PRODUCT ADDITION
// ============================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  if (!userSessions[chatId]) return;
  const session = userSessions[chatId];

  if (session.step === "name") {
    session.name = msg.text;
    session.step = "price";
    return bot.sendMessage(chatId, "Enter the product price:");
  }

  if (session.step === "price") {
    const price = parseFloat(msg.text);
    if (isNaN(price))
      return bot.sendMessage(chatId, "Please enter a valid price.");
    session.price = price;
    session.step = "weight";
    return bot.sendMessage(chatId, "Enter the product weight:");
  }

  if (session.step === "weight") {
    const weight = parseFloat(msg.text);
    if (isNaN(weight))
      return bot.sendMessage(chatId, "Please enter a valid weight.");
    session.weight = weight;
    session.step = "image";
    return bot.sendMessage(chatId, "Now send the product image.");
  }

  if (session.step === "delete") {
    const productName = msg.text;
    try {
      const stmt = db.prepare("SELECT image FROM products WHERE name = ?");
      const row = stmt.get(productName);

      if (!row) {
        bot.sendMessage(chatId, "❌ Product not found.");
        delete userSessions[chatId];
        return;
      }

      const imagePath = path.join(PUBLIC_DIR, row.image);

      // Delete product from database
      const deleteStmt = db.prepare("DELETE FROM products WHERE name = ?");
      deleteStmt.run(productName);

      // Delete the image file
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      bot.sendMessage(chatId, "✅ Product deleted successfully!");
    } catch (error) {
      console.error("Error deleting product:", error.message);
      bot.sendMessage(chatId, "Error deleting product.");
    }
    delete userSessions[chatId];
  }
});

// ============================================
// TELEGRAM BOT - HANDLE PHOTO MESSAGES
// ============================================
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions[chatId];
  if (!session || session.step !== "image") return;

  const photo = msg.photo[msg.photo.length - 1]; // Get the highest resolution
  const fileId = photo.file_id;

  try {
    const fileLink = await bot.getFileLink(fileId);
    const fileName = `${Date.now()}_${chatId}.jpg`;
    const filePath = path.join(PUBLIC_DIR, fileName);

    // Download and save the image
    const response = await fetch(fileLink);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    // Save product data to database
    const insertStmt = db.prepare(
      "INSERT INTO products (name, price, image, weight) VALUES (?, ?, ?, ?)"
    );
    insertStmt.run(session.name, session.price, fileName, session.weight);

    bot.sendMessage(chatId, "✅ Product added successfully!");

    // Clear session
    delete userSessions[chatId];
  } catch (error) {
    console.error("Error downloading image:", error);
    bot.sendMessage(chatId, "Error processing image.");
  }
});

// ============================================
// TELEGRAM BOT - COMMAND: /deleteproduct
// ============================================
bot.onText(/\/deleteproduct/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = { step: "delete" };
  bot.sendMessage(chatId, "Enter the product name you want to delete:");
});

// ============================================
// EXPRESS API ROUTES
// ============================================

// Get all products
app.get("/api/products", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM products");
    let rows = stmt.all();

    // Add proper image URL paths if they're not absolute URLs
    rows = rows.map((product) => ({
      ...product,
      image: product.image.startsWith("http")
        ? product.image
        : `/${product.image}`,
    }));

    console.log("📦 Fetched products:", rows);
    res.setHeader("Content-Type", "application/json");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`🤖 Telegram bot is polling...`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  try {
    db.close();
    console.log("✅ Database connection closed.");
  } catch (error) {
    console.error("Error closing database:", error.message);
  }
  process.exit(0);
});
