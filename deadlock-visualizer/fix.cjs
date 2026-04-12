const fs = require('fs');

const files = [
  'src/store.ts',
  'src/algorithms/deadlockDetection.ts',
  'src/components/ControlPanel.tsx',
  'src/components/Canvas.tsx',
  'src/components/MatrixPanel.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\$/g, '$');
  content = content.replace(/\\`/g, '`');
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
