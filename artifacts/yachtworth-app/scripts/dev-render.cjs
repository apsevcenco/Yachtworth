'use strict';

const { spawn } = require('child_process');

function stripProtocol(value) {
  return value.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

const apiDomain =
  process.env.EXPO_PUBLIC_DOMAIN ||
  process.env.RENDER_API_DOMAIN ||
  process.env.RENDER_EXTERNAL_HOSTNAME ||
  '';
const clerkKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY ||
  '';

if (!apiDomain.trim()) {
  process.stderr.write(
    'Missing API domain. Set EXPO_PUBLIC_DOMAIN or RENDER_API_DOMAIN to your Render API host.\n',
  );
  process.stderr.write('Example: $env:EXPO_PUBLIC_DOMAIN="yachtworth-api.onrender.com"\n');
  process.exit(1);
}

if (!clerkKey.trim()) {
  process.stderr.write(
    'Missing Clerk key. Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY.\n',
  );
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
const hasModeArg = extraArgs.some((arg) => ['--tunnel', '--lan', '--localhost'].includes(arg));
const args = ['exec', 'expo', 'start', ...(hasModeArg ? [] : ['--tunnel']), ...extraArgs];
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const child = spawn(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: stripProtocol(apiDomain),
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkKey,
  },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
