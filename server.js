const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors"); // Add this
const app = express();
const port = 3000;

// Middleware
app.use(express.json());

app.use(cors()); // Enable CORS for all routes
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "public/images")));

const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Error connecting to the SQLite database:", err.message);
    return;
  }
  console.log("Connected to the SQLite database.");

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
      console.log("Products table created or already exists.");

      // Initial data insertion (commented out after first run)
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
                  console.log(`Inserted ${product.name} into products table.`);
                }
              }
            );
          });
        } else {
          console.log("Products table already contains data.");
        }
      });
    }
  );
});

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    }
    console.log("Database connection closed.");
    process.exit(0);
  });
});
