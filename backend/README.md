# 🛒 Ecommerce Supermarket — Backend API

A production-ready RESTful API built with **Node.js + Express + MySQL**.  
Modular layered architecture: `Route → Controller → Service → Model → DB`.

---

## 🗂️ Project Structure

```
src/
├── config/
│   ├── db.js                  # MySQL connection pool
│   └── cloudinary.js          # Cloudinary + multer upload config
│
├── modules/
│   ├── auth/                  # JWT login, /me
│   ├── users/                 # Admin management (super_admin only)
│   ├── products/              # Products + variants + image upload
│   ├── categories/            # Product categories
│   ├── orders/                # Guest checkout with DB transaction
│   ├── customers/             # Customer read-only view
│   ├── complaints/            # Customer complaints
│   ├── inventory/             # Stock logs + restock
│   ├── messages/              # Customer service chat
│   └── dashboard/             # Admin stats & analytics
│
├── middlewares/
│   ├── auth.middleware.js     # JWT verification
│   ├── role.middleware.js     # Role-based access control
│   ├── validate.middleware.js # Joi schema validation
│   └── error.middleware.js    # Global error handler
│
├── utils/
│   ├── AppError.js            # Custom error class
│   ├── jwt.helper.js          # JWT sign/verify helpers
│   └── pagination.helper.js   # Pagination utilities
│
├── app.js                     # Express app (middlewares + routes)
└── server.js                  # HTTP server + graceful shutdown
```

---

## ⚙️ Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your DB credentials, JWT secret, Cloudinary keys
```

### 3. Import database schema
```bash
mysql -u root -p < schema.sql
```

### 4. Create first super_admin user
```sql
INSERT INTO users (name, email, password_hash, role)
VALUES ('Super Admin', 'admin@example.com', '$2a$12$...bcrypt_hash...', 'super_admin');
```
> Generate hash: `node -e "require('bcryptjs').hash('yourpassword', 12).then(console.log)"`

### 5. Run the server
```bash
# Development
npm run dev

# Production
npm start
```

---

## 🔐 Authentication

All protected routes require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

**Roles:**
- `admin` — standard admin access
- `super_admin` — full access including user management

---

## 📡 API Reference

### Base URL
```
http://localhost:3000/api
```

---

### 🔑 Auth

| Method | Endpoint     | Auth     | Description           |
|--------|-------------|----------|-----------------------|
| POST   | /auth/login | Public   | Login and get JWT     |
| GET    | /auth/me    | Admin    | Get current user info |

**POST /auth/login**
```json
{
  "email": "admin@example.com",
  "password": "yourpassword"
}
```

---

### 👥 Users *(super_admin only)*

| Method | Endpoint    | Description       |
|--------|-------------|-------------------|
| GET    | /users      | List all admins   |
| GET    | /users/:id  | Get single admin  |
| POST   | /users      | Create admin      |
| PUT    | /users/:id  | Update admin      |
| DELETE | /users/:id  | Delete admin      |

---

### 🗂️ Categories

| Method | Endpoint          | Auth   | Description      |
|--------|------------------|--------|------------------|
| GET    | /categories       | Public | List categories  |
| GET    | /categories/:id   | Public | Get category     |
| POST   | /categories       | Admin  | Create category  |
| PUT    | /categories/:id   | Admin  | Update category  |
| DELETE | /categories/:id   | Admin  | Delete category  |

---

### 📦 Products

| Method | Endpoint                    | Auth   | Description          |
|--------|----------------------------|--------|----------------------|
| GET    | /products                   | Public | List products        |
| GET    | /products/:id               | Public | Get product + variants |
| POST   | /products                   | Admin  | Create product (multipart/form-data for image) |
| PUT    | /products/:id               | Admin  | Update product       |
| DELETE | /products/:id               | Admin  | Delete product       |
| POST   | /products/:id/variants      | Admin  | Add variant          |
| PUT    | /products/variants/:variantId | Admin | Update variant     |
| DELETE | /products/variants/:variantId | Admin | Delete variant     |

**Query params for GET /products:**
- `page`, `limit` — pagination
- `category_id` — filter by category
- `search` — search by name/description
- `is_active` — admin only filter

**Image upload:** send as `multipart/form-data` with field name `image`.

---

### 🛒 Orders

| Method | Endpoint              | Auth   | Description              |
|--------|-----------------------|--------|--------------------------|
| POST   | /orders               | Public | Create order (guest checkout) |
| GET    | /orders               | Admin  | List all orders          |
| GET    | /orders/:id           | Admin  | Get order details        |
| PATCH  | /orders/:id/status    | Admin  | Update order status      |

**POST /orders payload:**
```json
{
  "customer": {
    "full_name": "John Doe",
    "phone": "0555123456",
    "address_line": "123 Main St",
    "postal_code": "16000"
  },
  "items": [
    { "product_id": 1, "variant_id": 2, "quantity": 3 },
    { "product_id": 5, "variant_id": null, "quantity": 1 }
  ]
}
```

**Order status flow:**
```
pending → confirmed → delivered
        ↘ rejected
confirmed → failed
```

**PATCH /orders/:id/status:**
```json
{ "status": "confirmed" }
```

---

### 👤 Customers *(admin only)*

| Method | Endpoint        | Description                         |
|--------|----------------|-------------------------------------|
| GET    | /customers      | List customers (search supported)   |
| GET    | /customers/:id  | Get customer + their order history  |

---

### 📣 Complaints

| Method | Endpoint                   | Auth   | Description         |
|--------|---------------------------|--------|---------------------|
| POST   | /complaints                | Public | Submit complaint    |
| GET    | /complaints                | Admin  | List complaints     |
| GET    | /complaints/:id            | Admin  | Get complaint       |
| PATCH  | /complaints/:id/status     | Admin  | Update status       |

---

### 📦 Inventory *(admin only)*

| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| GET    | /inventory/logs     | View inventory logs  |
| POST   | /inventory/restock  | Add stock to variant |

**POST /inventory/restock:**
```json
{
  "variant_id": 3,
  "quantity": 50,
  "reason": "restock"
}
```

---

### 💬 Messages

| Method | Endpoint     | Auth   | Description                          |
|--------|-------------|--------|--------------------------------------|
| POST   | /messages   | Public | Send a message                       |
| GET    | /messages   | Admin  | List messages (filter: ?order_id=X)  |

---

### 📊 Dashboard *(admin only)*

| Method | Endpoint          | Description                                      |
|--------|------------------|--------------------------------------------------|
| GET    | /dashboard/stats  | Total orders, revenue, top products, low stock  |

**Response includes:**
- Orders breakdown by status
- Total & daily revenue (last 7 days)
- Total customers & products
- Top 5 best-selling products
- Low stock alerts (stock < 5)
- Open complaints count

---

## 🔒 Security Features

- **Helmet** — HTTP security headers
- **CORS** — configurable allowed origins
- **Rate limiting** — 100 req/15min globally, 10 req/15min on login
- **Input validation** — Joi schemas on all write endpoints
- **SQL injection** — protected via parameterized queries
- **Password hashing** — bcrypt with salt rounds 12
- **JWT** — stateless auth with expiry

---

## ⚠️ Critical Design Decisions

1. **Prices are ALWAYS computed server-side** — frontend prices are ignored
2. **Order creation uses a DB transaction** — atomic stock deduction + logging
3. **Stock is tracked per variant** — not on the product directly
4. **Inventory is always logged** — every stock change has an audit trail
5. **Status transitions are validated** — invalid transitions are rejected

---

## 🏥 Health Check

```
GET /health
```
Returns server status, timestamp, and environment.
