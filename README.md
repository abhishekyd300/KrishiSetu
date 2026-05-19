# 🌱 Farmer Direct Market Platform

A full-stack marketplace connecting farmers directly with buyers using **Express.js**, **MongoDB**, and **HTML/CSS/EJS**.

## Features

### For Farmers 🧑‍🌾
- Register and create profile
- Add crop listings with images, price, quantity
- Manage listings (view, delete)
- View incoming orders
- Mark orders as dispatched
- Track earnings
- **Receive payments directly via escrow**

### For Buyers 🛒
- Browse all available crops
- Search and filter by category
- View detailed crop information
- Place orders with delivery address
- **Secure payment via Razorpay**
- **Escrow protection** - money held until delivery confirmed
- Track order status
- Confirm delivery

### System Features
- User authentication (session-based)
- Role-based access (farmer/buyer)
- Image upload for crops
- **Razorpay payment integration**
- **Escrow payment system**
- Order status workflow: Pending → Payment Held → Dispatched → Delivered → Completed
- Payment verification & signature validation
- Webhook support for payment events
- Responsive design

## Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- Express Session (authentication)
- Multer (file uploads)
- bcryptjs (password hashing)
- **Razorpay SDK** (payment gateway)

**Frontend:**
- HTML5
- CSS3 (custom styling)
- EJS (templating)
- Vanilla JavaScript
- **Razorpay Checkout.js** (payment UI)


### 5. Run the application

```bash
# Development mode (with auto-restart on file changes)
npm run dev

# Production mode
npm start
```
