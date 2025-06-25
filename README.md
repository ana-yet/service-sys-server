# 🔧 Service Review System - Backend

This is the **server-side application** for the Service Review System. It provides a RESTful API built with **Express.js** and **MongoDB**, handles authentication using **Firebase Admin SDK**, and performs core business logic like reviews, ratings, and service management.

🔗 **Live Frontend Link**: [https://review-system-app.web.app/](https://review-system-app.web.app/)

---

## 🚀 Features

- 🔐 JWT-based Firebase authentication middleware
- 📦 Add, edit, delete services (protected routes)
- 🗳️ Add, update, and delete reviews
- ⭐ Dynamic rating calculation per service
- 🧮 Dashboard count summary (users, reviews, services)
- 🔍 Filter and search services
- 📚 Distinct categories from service collection
- 🧑 User profile & services management
- ⚙️ MongoDB with three collections:
  - `AllServices`
  - `Review`
  - `User`

---

## 🛠️ Tech Stack

- Node.js

- Express.js ^5.1.0

- MongoDB ^6.17.0

- Firebase Admin SDK ^13.4.0

- dotenv ^16.5.0

- CORS ^2.8.5



---

## 📁 API Endpoints Overview

| Method | Endpoint                      | Description                         |
| ------ | ----------------------------- | ----------------------------------- |
| GET    | `/services`                   | Get all services with search/filter |
| GET    | `/services/:id`               | Get single service by ID            |
| POST   | `/allServices`                | Add new service (protected)         |
| PATCH  | `/my-service`                 | Update user’s own service           |
| DELETE | `/my-service`                 | Delete user’s own service           |
| GET    | `/my-service/:email`          | Get services by user email          |
| GET    | `/featured`                   | Get top 6 services by review count  |
| GET    | `/reviews?id=serviceId`       | Get reviews for a service           |
| POST   | `/review`                     | Post a new review (protected)       |
| PATCH  | `/review/:id`                 | Update a review and refresh ratings |
| DELETE | `/review/:id`                 | Delete a review                     |
| GET    | `/my-review?email=user@email` | Get user's reviews                  |
| GET    | `/user?email=user@email`      | Get single user                     |
| POST   | `/user`                       | Create new user                     |
| GET    | `/counts`                     | Get user, review, service counts    |

---

## 🔐 Firebase Authentication (Admin SDK)

The API uses **Firebase Admin SDK** to verify tokens on protected routes.

- Protected routes use a middleware called `verifyToken`.
- JWT must be sent in the `Authorization` header:

## ⚙️ Installation & Setup

- 1. Clone the Repository

- 2. Install Dependencies
     `npm install`
- 3. Add .env File
     Follow the format above to configure your MongoDB URI and Firebase credentials.

- 4. Start Server

`npm start index.js`

## 📂 Folder Structure

```
├── index.js                 # Main server file
├── .env                     # Environment variables
├── package.json             # Project config
└── README.md
```
