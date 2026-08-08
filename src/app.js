import express from "express";
import dotenv from 'dotenv';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { logger } from './utils/logger.js';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ quiet: true });

// Environment Startup Validation
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "EMAIL_USER", "EMAIL_PASS"];
for (const envVar of REQUIRED_ENV) {
  if (!process.env[envVar]) {
    logger.error(`CRITICAL STARTUP ERROR: Environment variable "${envVar}" is missing!`);
    process.exit(1);
  }
}

import userRoutes from "./routes/users.router.js";
import attendanceRoutes from "./routes/attendance.router.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

// Trust Vercel proxy for accurate client IP rate limiting
app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: null, // Disable forcing HTTPS on local IP connections
    },
  },
  hsts: false, // Disable HSTS to allow HTTP connections from mobile devices on local networks
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({
  limit: '100kb'
}));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { message: "Too many sign-in attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many accounts created from this IP. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { message: "Too many OTP requests. Please try again in 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enforce specific limits on authentication/sensitive pathways
app.use("/users/signin", authLimiter);
app.use("/users/signup", signupLimiter);
app.use("/users/forgot-password/otp", otpLimiter);
app.use("/users/forgot-password/reset", otpLimiter);
app.use("/users/me/password/otp", otpLimiter); // Updated to /users/me

// General limiter on other API routes
app.use("/users", generalLimiter);
app.use("/attendance", generalLimiter);

app.use("/users", userRoutes);
app.use("/attendance", attendanceRoutes);

// Centralized error handling middleware
app.use(errorHandler);

export default app;