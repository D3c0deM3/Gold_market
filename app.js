require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ============================================
// CONFIGURATION
// ============================================
const BOT_TOKEN = process.env.BOT_TOKEN || "7593096494:AAG7GWaVEPgeVSpWbSuZQzTJAJsfLtb48PA";
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

// ============================================
// ENSURE PUBLIC DIRECTORY EXISTS
// ============================================
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// ============================================
// DATABASE CONNECTION
// ============================================
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Error connecting to SQLite database:", err.message);
    return;
  }
  console.log("✅ Connected to SQLite database.");

  // Create products table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      weight REAL NOT NULL
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating table:", err.message);
        return;
      }
      console.log("✅ Products table created or already exists.");

      // Initial data insertion (only if table is empty)
      db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (err) {
          console.error("Error checking table count:", err.message);
          return;
        }
        if (row.count === 0) {
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

          initialProducts.forEach((product) => {
            db.run(
              `INSERT INTO products (name, price, image, weight) VALUES (?, ?, ?, ?)`,
              [product.name, product.price, product.image, product.weight],
              (err) => {
                if (err) {
                  console.error("Error inserting initial data:", err.message);
                } else {
                  console.log(`✅ Inserted ${product.name} into products table.`);
                }
              }
            );
          });
        } else {
          console.log("✅ Products table already contains data.");
        }
      });
    }
  );
});

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
    db.get(
      "SELECT image FROM products WHERE name = ?",
      [productName],
      (err, row) => {
        if (err) {
          console.error("Error finding product:", err.message);
          bot.sendMessage(chatId, "Error finding the product.");
          return;
        }
        if (!row) {
          bot.sendMessage(chatId, "❌ Product not found.");
          return;
        }

        const imagePath = path.join(PUBLIC_DIR, row.image);

        // Delete product from database
        db.run("DELETE FROM products WHERE name = ?", [productName], (err) => {
          if (err) {
            console.error("Error deleting product:", err.message);
            bot.sendMessage(chatId, "Error deleting product.");
          } else {
            // Delete the image file
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }
            bot.sendMessage(chatId, "✅ Product deleted successfully!");
          }
        });
      }
    );
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
    db.run(
      `INSERT INTO products (name, price, image, weight) VALUES (?, ?, ?, ?)`,
      [session.name, session.price, fileName, session.weight],
      (err) => {
        if (err) {
          console.error("Error inserting data:", err.message);
          bot.sendMessage(chatId, "Error saving product.");
        } else {
          bot.sendMessage(chatId, "✅ Product added successfully!");
        }
      }
    );

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
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) {
      console.error("Error fetching products:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.json(rows);
  });
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
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    }
    console.log("✅ Database connection closed.");
    process.exit(0);
  });
});
