'use strict';
const fs = require('fs');
const path = require('path');

// Resolve paths relative to the repo root (cwd when pnpm install runs)
const root = process.cwd();

for (const lock of ['package-lock.json', 'yarn.lock']) {
  const p = path.join(root, lock);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
}

const userAgent = process.env.npm_config_user_agent ?? '';
if (!userAgent.startsWith('pnpm/')) {
  process.stderr.write('Use pnpm instead\n');
  process.exit(1);
}
