# Chirpy HTTP Server (TypeScript)

A backend REST API built with **Node.js**, **TypeScript**, and **Express**.
The server implements authentication, authorization, refresh tokens, database storage, and webhook handling.

This project demonstrates how to build a **production-style backend server from scratch** with clean architecture and proper error handling.

---

# Features

* REST API built with **Express**
* **TypeScript** for type safety
* **PostgreSQL** database
* **Drizzle ORM** for database queries
* **JWT Authentication**
* **Refresh Token system**
* **Password hashing using Argon2**
* **Authorization middleware**
* **Webhook integration**
* **Global error handling middleware**
* **Metrics endpoint for monitoring**
* **Static file serving**
* **Modular architecture**

---

# Environment Variables

Create a `.env` file:

```
DB_URL=postgres://user:password@localhost:5432/chirpy
JWT_SECRET=your_jwt_secret
POLKA_KEY=your_webhook_key
PLATFORM=dev
```

---

# Run the Server

Run migrations and start the server

npm run build
```
npm run start
```

Server runs at

```
http://localhost:8080
```

---


