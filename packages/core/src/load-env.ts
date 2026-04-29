import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
for (const name of ['.env', '.env.local']) {
  const path = resolve(repoRoot, name);
  if (existsSync(path)) {
    config({ path, override: name === '.env.local' });
  }
}
