import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = fileURLToPath(new URL('../', import.meta.url));

// Load server/.env when present; in production the host provides real env vars.
try {
  process.loadEnvFile(path.join(serverDir, '.env'));
} catch {
  // no .env file
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} (see server/.env.example)`);
  return value;
}

export const env = {
  // API_PORT wins locally; hosting platforms (Render, Railway…) provide PORT.
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  jwtSecret: required('JWT_SECRET'),
  uploadDir: path.resolve(serverDir, process.env.UPLOAD_DIR ?? 'uploads'),
  isProd: process.env.NODE_ENV === 'production',
};
