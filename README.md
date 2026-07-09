# AgriMarket Platform - Rwandan E-Commerce Marketplace

**Course Name & Code:** EWA408510 – E-Commerce and Web Application  
**Student Name:** URAYENEZA Jean De Dieu  
**Registration Number:** 21068/2023  
**Instructor:** Eric Maniraguha  
**Institution:** University of Lay Adventists of Kigali (UNILAK)  
**Academic Year:** 2025-2026  
**Assessment:** Final Examination (Project-Based Individual Project)  

---

## 🌾 Project Overview & Scenario
AgriMarket is a premium, fully featured E-Commerce Web Application built to connect local Rwandan agricultural producers (e.g. from Musanze, Gicumbi, Nyagatare, Gatsibo) directly with urban consumers in Kigali. 

The application facilitates:
1. **Buyers** to search, browse categories, read agricultural guide blogs, manage shopping carts, and place orders with validation.
2. **Vendors** to list crops, track sales metrics via a custom analytics dashboard, update order shipment statuses, and edit listings.

---

## 🚀 Key Features

### 1. User Interface & Premium UI/UX (5 Marks)
* **Visual Excellence:** Soft sage and emerald leaf-green gradients, clean white headers, card styling using the **Plus Jakarta Sans** Google Font.
* **Autoplay Hero Carousel:** Interactive multi-slide advertisement carousel presenting organic farming copy, Northern Hills farmer spotlights, and secure payment checkout information with autoplay transitions (every 6 seconds).
* **Responsive/Mobile-First:** Optimized for mobile phones and tablet viewports.
* **Vector Icons:** High-resolution vector SVGs replace unprofessional text emojis for shopping carts, star ratings, wishlist hearts, and chevron sliders.

### 2. Product Management (4 Marks)
* **Dynamic Search:** Full text search bar linked to active URL routing (`/?search=query`).
* **Category Filters:** Quick filter badges (Grains, Vegetables, Fruits, Tubers, Other) to filter products instantly.
* **Double-Layer Error Fallbacks:** Crops and banner images automatically fall back to stylized category emoji blocks with leaf gradient backgrounds if loading from the unsplash CDN fails.

### 3. Shopping Cart & Checkout Process (4 + 4 Marks)
* **Cart Features:** Add, remove, update quantities, and live subtotal calculations.
* **Rigorous Validation:** Validates MTN/Airtel Mobile Money numbers (`+2507xxxxxxxx` format must be exactly 13 characters).
* **Payment Gateways:** Interactive toggle support between MTN MoMo payments and Cash-on-Delivery (COD).
* **Receipt Generation:** Renders complete confirmation receipts showing order summaries, totals, delivery address, and transaction IDs.

### 4. Database Integration (5 Marks)
* Relational database tables managing products, buyers, sellers, orders, and order items.
* Automatically seeded with real-world Rwandan test crops (Musanze Tomatoes, Gicumbi Cabbages, Northern Potatoes, etc.) and a mock vendor account (**Farmer Kamana**).

---

## 🛠️ Technology Stack
* **Frontend:** React (TypeScript), Vite, TailwindCSS (for styles & layout).
* **Backend:** Node.js, Express, PostgreSQL Client (`pg`).
* **Database:** PostgreSQL.
* **DevOps:** Docker, Docker Compose, GitHub Actions.

---

## 🐳 Docker Containerization Setup (4 Marks)
The application is fully containerized across three tiers:
1. **`db`**: PostgreSQL Database (using official Postgres alpine image).
2. **`backend`**: Node.js API server (exposing port `5000`).
3. **`frontend`**: Vite production build served over an alpine Nginx web server (exposing port `80`) with SPA routing fallbacks.

### To build and launch the platform using Docker:
```bash
# 1. Clone the repository and navigate to the project directory
cd agri-market-platform

# 2. Build and launch all services in the background
docker-compose up --build -d

# 3. Seed the PostgreSQL database with initial crop listings
docker exec -it agri_market_backend node initDB.js

# 4. View the web application
Open http://localhost/ in your browser
```

---

## 📦 Local Installation (Without Docker)

### Backend API Setup:
```bash
cd server
npm install

# Setup env variables in server/.env (DB_USER, DB_PASSWORD, JWT_SECRET, etc.)
# Run database seeder:
node initDB.js

# Start API Server:
npm run dev # Launches on http://localhost:5000
```

### Frontend Setup:
```bash
npm install
npm run dev # Launches on http://localhost:5173
```

---

## 🔄 GitHub Actions CI/CD Pipeline (4 Marks)
A continuous integration pipeline is registered inside `.github/workflows/ci-cd.yml`.
The workflow triggers on any push or pull request to the `main` or `master` branches, performing the following checks:
1. **Frontend Validation:** Checks out code, installs dependencies, and runs `npm run build` compilation verification.
2. **Backend Validation:** Installs Node dependencies and validates Javascript syntax compilation.
3. **Docker Build Checks:** Builds the frontend and backend Dockerfiles to verify container integrity before merge.

---

## 📊 Database Schema Design
The database manages relationships between:
* **`users`**: Stores client info (roles: `buyer` or `vendor`), hashed passwords, names, and emails.
* **`products`**: Product listings (name, category, description, price, stock, image_url, and foreign key reference to `vendor_id`).
* **`orders`**: Keeps transaction states, shipping addresses, MoMo phone numbers, total pricing, order status, and foreign key reference to `buyer_id`.
* **`order_items`**: Junction table relating order keys to product IDs, tracking quantities.

---

## 📞 Instructor Contacts & Credits
* **Instructor:** Eric Maniraguha (UNILAK Faculty of Computing)
* **Student Name:** URAYENEZA Jean De Dieu
* **Registration Number:** 21068/2023
* **Academic Year:** 2025-2026
