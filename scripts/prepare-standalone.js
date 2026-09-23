const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');
const staticSource = path.join(root, '.next', 'static');
const staticTarget = path.join(standalone, '.next', 'static');
const publicSource = path.join(root, 'public');
const publicTarget = path.join(standalone, 'public');

function copyDir(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

if (!fs.existsSync(standalone)) {
  console.log('Standalone output not found; skipping asset copy.');
  process.exit(0);
}

copyDir(staticSource, staticTarget);
copyDir(publicSource, publicTarget);
console.log('Prepared standalone assets: .next/static and public');
