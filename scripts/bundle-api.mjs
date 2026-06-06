import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

buildSync({
  entryPoints: ['api/entry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'api/index.js',
  external: ['@prisma/client'],
  alias: {
    '@cadence/shared': './packages/shared/dist/index.js',
  },
});

const bundle = readFileSync('api/index.js', 'utf8');
writeFileSync(
  'api/index.js',
  `${bundle}\nmodule.exports = module.exports.default || module.exports;\n`,
);

console.log('API bundle written to api/index.js');
