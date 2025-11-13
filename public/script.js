let cart = JSON.parse(localStorage.getItem("cart")) || [];

async function fetchProducts() {
  try {
    const response = await fetch("http://localhost:3000/api/products");
    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers.get("Content-Type"));
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const text = await response.text();
    console.log("Raw response:", text);
    const trimmedText = text.trim();
    const products = JSON.parse(trimmedText);
    console.log("✅ Parsed products:", products);
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    alert("Failed to load products. Make sure the server is running!");
    return [];
  }
}

function updateCart() {
  const cartItems = document.getElementById("cart-items");
  const cartCount = document.getElementById("cart-count");
  const totalPrice = document.getElementById("total-price");
  cartItems.innerHTML = "";
  let total = 0;

  const productCounts = {};
  cart.forEach((item) => {
    if (!productCounts[item.name]) {
      productCounts[item.name] = { ...item, quantity: 0 };
    }
    productCounts[item.name].quantity++;
  });

  Object.values(productCounts).forEach((item) => {
    total += item.price * item.quantity;
    const cartItem = document.createElement("div");
    cartItem.style.display = "flex";
    cartItem.style.alignItems = "center";
    cartItem.style.justifyContent = "space-between";
    cartItem.style.padding = "10px";
    cartItem.style.borderBottom = "1px solid #ddd";

    cartItem.innerHTML = `
      <img src="${item.image}" alt="${
      item.name
    }" style="width:50px; height:50px; border-radius:5px;"> 
      <div style="flex: 1; text-align: left; margin-left: 10px;">
        <h3 style="margin: 0; font-size: 16px;">${item.name}</h3>
        <p style="margin: 5px 0; font-size: 14px;">$${item.price} x ${
      item.quantity
    } = $${item.price * item.quantity}</p>
      </div>
      <div>
        <button onclick="changeQuantity('${item.name}', 1)">+</button>
        <button onclick="changeQuantity('${item.name}', -1)">-</button>
      </div>
    `;
    cartItems.appendChild(cartItem);
  });

  cartCount.innerText = cart.length;
  cartCount.style.display = cart.length > 0 ? "block" : "none";
  totalPrice.innerText = total;
  localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(product) {
  console.log("Adding to cart:", product);
  cart.push(product);
  updateCart();
}

function changeQuantity(name, delta) {
  const index = cart.findIndex((item) => item.name === name);
  if (index !== -1) {
    if (delta === -1) {
      cart.splice(index, 1);
    } else {
      cart.push(cart[index]);
    }
  }
  updateCart();
}

function toggleCart() {
  const cartPanel = document.getElementById("cart-panel");
  if (cartPanel.classList.contains("open")) {
    cartPanel.style.transition = "right 0.5s ease-in-out";
    cartPanel.classList.remove("open");
    setTimeout(() => (cartPanel.style.right = "-100%"), 500);
  } else {
    cartPanel.style.right = "0";
    cartPanel.style.transition = "right 0.5s ease-in-out";
    cartPanel.classList.add("open");
  }
}

function openProductPage(product) {
  console.log("Opening product page:", product);
  localStorage.setItem("product", JSON.stringify(product));
  window.location.href = "product.html";
}

function about(product) {
  console.log("Navigating to about page:", product);
  const productPageUrl = `product-details.html?name=${encodeURIComponent(
    product.name
  )}&price=${product.price}&image=${encodeURIComponent(product.image)}&weight=${
    product.weight
  }`;
  window.location.href = productPageUrl;
}

function checkout() {
  if (cart.length === 0) {
    alert("Savatchangiz bo‘sh!");
    return;
  }

  // Show the modal
  const modal = document.getElementById("checkout-modal");
  const closeModal = document.getElementById("close-modal");
  const checkoutForm = document.getElementById("checkout-form");

  modal.style.display = "flex";

  // Close modal when clicking the close button
  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Close modal when clicking outside the modal content
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  // Handle form submission
  checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent form from refreshing the page

    const fullName = document.getElementById("full-name").value.trim();
    const phoneNumber = document.getElementById("phone-number").value.trim();

    // Basic validation
    if (!fullName || !phoneNumber) {
      alert("Iltimos, to‘liq ism va telefon raqamini kiriting!");
      return;
    }

    // Construct the order message
    let orderMessage = "🛒 Buyurtma qabul qilindi!\n\n";
    orderMessage += `Ism: ${fullName}\n`;
    orderMessage += `Telefon: ${phoneNumber}\n\n`;

    let totalPrice = 0;
    cart.forEach((item, index) => {
      orderMessage += `${index + 1}. ${item.name} - $${item.price}\n`;
      totalPrice += item.price;
    });

    orderMessage += `\n💰 Umumiy: $${totalPrice}`;

    // Send the message to Telegram
    const botToken = "7593096494:AAG7GWaVEPgeVSpWbSuZQzTJAJsfLtb48PA";
    const chatId = "1508120182";
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: orderMessage }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok) {
          alert("Buyurtma yuborildi!");
          cart = [];
          localStorage.removeItem("cart");
          updateCart();
          modal.style.display = "none"; // Close the modal
          checkoutForm.reset(); // Reset the form fields
        } else {
          alert("Xatolik yuz berdi.");
        }
      })
      .catch((error) => {
        console.error("Xatolik:", error);
        alert("Xatolik yuz berdi.");
      });
  });
}

async function loadProducts() {
  const products = await fetchProducts();
  const productList = document.getElementById("product-list");
  productList.innerHTML = "";
  
  if (products.length === 0) {
    productList.innerHTML = "<p style='text-align: center; color: red;'>❌ No products found. Check server logs.</p>";
    console.warn("⚠️ No products returned from API");
    return;
  }
  
  console.log("🔄 Loading", products.length, "products");
  products.forEach((product, index) => {
    const productElement = document.createElement("div");
    productElement.classList.add("product");
    productElement.setAttribute("data-product", JSON.stringify(product));
    productElement.innerHTML = `
      <img src="${product.image}" alt="${product.name}" onerror="console.error('Image failed to load:', '${product.image}')">
      <h3>${product.name}</h3>
      <p>$${product.price}</p>
      <button class="add-to-cart-btn">Add to Cart</button>
      <button class="about-btn">about</button>
    `;

    const addToCartBtn = productElement.querySelector(".add-to-cart-btn");
    const aboutBtn = productElement.querySelector(".about-btn");
    const img = productElement.querySelector("img");

    addToCartBtn.addEventListener("click", () => {
      const productData = JSON.parse(
        productElement.getAttribute("data-product")
      );
      addToCart(productData);
    });

    aboutBtn.addEventListener("click", () => {
      const productData = JSON.parse(
        productElement.getAttribute("data-product")
      );
      about(productData);
    });

    img.addEventListener("click", () => {
      const productData = JSON.parse(
        productElement.getAttribute("data-product")
      );
      openProductPage(productData);
    });

    productList.appendChild(productElement);
  });
}

// Initial load
document.addEventListener('DOMContentLoaded', function() {
  console.log("🔄 Page loaded, initializing...");
  loadProducts();
  updateCart();
});

// Fallback for if DOMContentLoaded already fired
if (document.readyState === 'loading') {
  // Still loading
  document.addEventListener('DOMContentLoaded', function() {
    console.log("🔄 DOMContentLoaded fired");
    loadProducts();
    updateCart();
  });
} else {
  // Already loaded
  console.log("🔄 Document already loaded, initializing immediately");
  loadProducts();
  updateCart();
}
