'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'web-build');

function stripProtocol(value) {
  return value.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function pickEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return '';
}

function appendNodeOption(current, option) {
  if (current && current.includes(option)) return current;
  return [current, option].filter(Boolean).join(' ');
}

const apiDomain = pickEnv(
  'EXPO_PUBLIC_DOMAIN',
  'RENDER_API_DOMAIN',
  'RENDER_EXTERNAL_HOSTNAME',
) || 'yachtworth.onrender.com';

const clerkKey = pickEnv(
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_PUBLISHABLE_KEY',
);

if (!clerkKey) {
  process.stderr.write(
    'Missing Clerk key. Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY.\n',
  );
  process.exit(1);
}

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(
  command,
  [
    'exec',
    'expo',
    'export',
    '--platform',
    'web',
    '--output-dir',
    'web-build',
    '--clear',
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      NODE_OPTIONS: appendNodeOption(
        process.env.NODE_OPTIONS,
        '--max-old-space-size=8192',
      ),
      EXPO_PUBLIC_DOMAIN: stripProtocol(apiDomain),
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkKey,
      EXPO_PUBLIC_DISABLE_INTRO: process.env.EXPO_PUBLIC_DISABLE_INTRO || '1',
    },
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

// Render Static Site can serve route files directly. This marker documents
// the folder purpose and keeps empty-directory tooling honest if export changes.
fs.writeFileSync(
  path.join(outputDir, 'yachtworth-web-build.txt'),
  `Yachtworth desktop web build\nAPI: https://${stripProtocol(apiDomain)}\n`,
);
