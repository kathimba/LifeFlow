// src/lib/services/__tests__/setup.ts
import dotenv from "dotenv";
import path from "path";

// Load .env.test from the frontend/ root
// __dirname = src/lib/services/__tests__
// ../../../../ = frontend/
dotenv.config({ path: path.resolve(__dirname, "../../../../.env.test") });