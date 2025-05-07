import fs from 'node:fs';
import process from 'node:process';
import manifest from './src/manifest.json' with { type: 'json' };
import geckoPatch from './gecko-manifest-patch.json' with { type: 'json' };

const dir = process.argv[2];

if (fs.existsSync(dir)) {
  const patchedFile = { ...manifest, ...geckoPatch };
  fs.writeFileSync(
    `${dir}/manifest.json`,
    JSON.stringify(patchedFile, null, 2),
    'utf8',
  );
} else {
  console.error('This script should not be run manually');
  process.exit(1);
}
