/* eslint-disable no-console */

const path = require('path');
const SwaggerParser = require('@apidevtools/swagger-parser');

async function validate(specPath) {
  try {
    await SwaggerParser.validate(specPath);
    console.log(`OK: ${path.relative(process.cwd(), specPath)}`);
    return true;
  } catch (err) {
    console.error(`FAIL: ${path.relative(process.cwd(), specPath)}`);
    console.error(err?.message || err);
    return false;
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const specs = ['openapi.yaml', 'openapi.openclaw.yaml'].map((p) =>
    path.join(repoRoot, p),
  );

  const results = await Promise.all(specs.map(validate));
  if (results.some((ok) => !ok)) {
    process.exit(1);
  }
}

main();

