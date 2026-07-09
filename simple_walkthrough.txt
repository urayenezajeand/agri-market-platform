# 🌾 How to Build AgriMarket: A Simple Guide for Beginners!

Welcome! If you want to help a friend build their own online farmer's market (just like AgriMarket), this guide is for you. We will explain how the whole system works using simple terms and everyday analogies (like Legos, postmen, and notebook folders), followed by a step-by-step recipe to build it from scratch!

---

## 🏗️ Part 1: The Magic Recipe (The "Tech Stack")

Think of a web app like a restaurant:
1. **The Dining Room (The Frontend):** What the customer sees, sits on, and interacts with.
2. **The Waiter (The Backend API):** The person who takes your order from the dining room and carries it to the kitchen.
3. **The Kitchen & Pantry (The Database):** Where the food (data) is stored and prepared.
4. **The Shipping Container (Docker):** A magical box that packs up the whole restaurant so it can run exactly the same way anywhere in the world.

Here is what we use to build each part:

### 1. The Frontend (What You See)
* **React:** Think of React like **Lego blocks**. Instead of building a whole castle out of one big piece of plastic, you build small blocks (like a "Buy Button," a "Product Card," or a "Navigation Bar") and snap them together.
* **TypeScript:** This is like a **helper friend** who checks your spelling while you write code. If you make a mistake, it flags it immediately so you don't break the app later.
* **Vite:** A super-fast **starter motor** that runs the code on your computer instantly while you are building it.
* **Tailwind CSS:** A box of **colorful crayons and stickers**. It lets you style your Legos (make buttons green, round the corners, add shadows) without writing complicated design code.

### 2. The Backend (The Post Office / Waiter)
* **Node.js & Express:** This is the **post office** of our app. When a user clicks "Buy," the frontend sends a letter (a request). Express is the postal worker who reads the address (like `/api/products` or `/api/orders`) and delivers the letter to the right room.
* **JWT (Json Web Tokens):** This is like a **VIP wristband** at an amusement park. Once you log in, the server gives you a wristband. Every time you want to do something (like add a crop), you show the wristband so the server knows it's really you.

### 3. The Database (The Storage Room)
* **PostgreSQL:** This is a **digital filing cabinet**. It stores all our lists (Users, Crops, and Orders) in neat tables with rows and columns, just like an Excel spreadsheet.

### 4. The Containers (The Lunchboxes)
* **Docker:** Imagine trying to move a house. Instead of throwing everything in loose, you put them in **standard boxes**. Docker packs the Database, Backend, and Frontend into separate "boxes" (called containers) so they run perfectly on any computer.

---

## 🚶‍♂️ Part 2: Step-by-Step Walkthrough (Building It!)

Here is the plan your friend can follow to build this app from scratch:

### Step 1: Draw the Database Cabinet 🗄️
Before writing any code, we need to decide what information to save. We create 4 lists:
1. **Users List:** Name, email, hashed password (so nobody can steal it), and role (`buyer` or `vendor`).
2. **Crops List:** Crop name (like "Musanze Tomatoes"), description, price, how many are left in stock, and who is selling it.
3. **Orders List:** Who bought it, how much they paid, their address, and their MTN/Airtel phone number.
4. **Order Items List:** A breakdown of exactly how many tomatoes or potatoes were inside that specific order.

### Step 2: Build the Post Office Backend 📮
1. Create a folder named `server`.
2. Tell Node.js to start a new project by running `npm init` in your terminal.
3. Install your helper packages (Express, PG for database, and Bcrypt/JWT for safety) by running:
   ```bash
   npm install express cors pg bcryptjs jsonwebtoken dotenv
   ```
4. Write a script to build the database tables automatically.
5. Create paths (endpoints) so the frontend can ask for data:
   * `/api/auth/register` (to sign up new users).
   * `/api/products` (to get the list of crops).
   * `/api/orders` (to save a new purchase).

### Step 3: Setup the Frontend Lego Set 🧱
1. In a new folder, start a React project with Vite:
   ```bash
   npm create vite@latest frontend-app --template react-ts
   ```
2. Set up Tailwind CSS so you have access to colors and spacing. Customize it with nice agricultural colors: forest greens, soft sage, and warm beige.
3. Create **Global States (Contexts)**. These are like clouds of information floating above the app that any page can reach up and grab:
   * **Auth Context:** Remembers if you are logged in and if you are a buyer or a seller.
   * **Cart Context:** Remembers what crops you added to your basket and updates the total price automatically.

### Step 4: Build the Pages (The Lego Castles) 🏰
Create the screens the user will click through:
1. **Home Page:** A beautiful welcome screen with sliding banner pictures (like a slideshow) showcasing farm pictures, a search bar, and buttons to filter crops by categories (Vegetables, Grains, Fruits).
2. **Product Details Page:** A page showing a big picture of the crop, its price, and an "Add to Cart" button.
3. **Cart Page:** A list of what you want to buy, where you can click `+` or `-` to change quantities.
4. **Checkout Page:** A form where the buyer enters their delivery address and mobile money phone number. It must double-check that the phone number starts with `+2507` and is exactly 13 characters long!
5. **Dashboard Page (For Farmers):** A secret control room where farmers can see charts of how much money they made, add new crops to the shop, and change order statuses from "Pending" to "Delivered."

### Step 5: Connect Frontend to Backend (The Handshake) 🤝
Use the browser's built-in `fetch` command to make the frontend talk to the backend.
* When the home page loads, the frontend calls `fetch('http://localhost:5000/api/products')` to ask the backend for the crops list.
* The backend queries the PostgreSQL database, gets the crops, and sends them back.
* React displays them on the screen instantly!

### Step 6: Pack Everything into Docker Lunchboxes 🍱
1. Create a `Dockerfile` for the backend.
2. Create a `Dockerfile` for the frontend (this will use Nginx, a lightweight server, to serve the React pages).
3. Create a `docker-compose.yml` file to link the Database, Backend, and Frontend.
4. Now, all your friend has to do is run:
   ```bash
   docker-compose up --build -d
   ```
   And *boom!* The entire app starts running on their computer at `http://localhost`.

---

## 🎉 You're Ready!
Show this file to your friend. They can start by building **Step 1** (the database schema) and **Step 2** (the server), then move on to visual layout. Have fun coding!
