const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'database', 'migrations');
const dest = path.join(__dirname, '..', 'dist', 'database', 'migrations');

if (!fs.existsSync(src)) {
  console.error('Migrations source not found:', src);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  if (!file.endsWith('.sql')) continue;
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}

console.log(`Copied migrations to ${dest}`);
