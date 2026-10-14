// Creates server/.env from .env.example with a fresh random JWT_SECRET.
// Does nothing if .env already exists. Run: node server/scripts/init-env.mjs
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(serverDir, '.env');

if (existsSync(envPath)) {
  console.log('server/.env already exists, leaving it alone');
} else {
  const example = readFileSync(join(serverDir, '.env.example'), 'utf8');
  const env = example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(32).toString('hex')}`);
  writeFileSync(envPath, env);
  console.log('Created server/.env with a new JWT_SECRET');
}
