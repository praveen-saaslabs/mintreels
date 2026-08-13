const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'FILESTACK_API_KEY',
  'PYAI_API_KEY',
  'PYAI_BASE_URL',
] as const;

function isSet(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim() !== '');
}

function setup(): void {
  const missing = required.filter((name) => !isSet(name));

  if (missing.length > 0) {
    console.log('Setup incomplete. Copy .env.example to .env and set:');
    for (const name of missing) {
      console.log(`- ${name}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Required environment variables are present. Values are not printed.');
}

setup();
