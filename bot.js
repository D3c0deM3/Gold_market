const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Bot Token & Public Directory Path
const BOT_TOKEN = "7593096494:AAG7GWaVEPgeVSpWbSuZQzTJAJsfLtb48PA";
const PUBLIC_DIR = path.join(__dirname, "public"); // Save directly to public/
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Ensure the public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Connect to Database
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) console.error("Error connecting to database:", err.message);
  else console.log("Connected to SQLite database.");
});

// Store user inputs temporarily
const userSessions = {};

// Ask for product name
bot.onText(/\/addproduct/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = { step: "name" };
  bot.sendMessage(chatId, "Enter the product name:");
});

// Handle text messages
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
});

// Handle photo messages
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

// Handle product deletion
bot.onText(/\/deleteproduct/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = { step: "delete" };
  bot.sendMessage(chatId, "Enter the product name you want to delete:");
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions[chatId];
  if (!session || session.step !== "delete") return;

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
});
