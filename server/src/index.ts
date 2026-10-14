import { createApp } from './app.js';
import { env } from './env.js';
import { ensureKnowledge } from './scoring/knowledge.js';

await ensureKnowledge();
const server = createApp().listen(env.port);
server.once('listening', () => console.log(`Divara API running on http://localhost:${env.port}`));
server.once('error', (error) => {
  console.error(`Could not start Divara API on port ${env.port}:`, error.message);
  process.exit(1);
});
