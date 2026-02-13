/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const REQUIRED_DOCS = [
  'docs/agent-implementation-log.md',
  'docs/backups.md',
  'docs/deployment.md',
  'docs/export-xlsx.md',
  'docs/openclaw-agent-api.md',
  'docs/recurring-expenses.md',
  'docs/testing.md',
];

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function looksLikeLocalFileLink(link) {
  // Only validate links that are clearly files, to avoid false positives with API paths like `/api/...`.
  return /\.(md|ya?ml|ts|js|cjs|json|sh|png|jpg|jpeg|svg)$/i.test(link);
}

function checkMarkdownLinks(docPath, content) {
  const errors = [];
  const linkRe = /\[[^\]]*]\(([^)]+)\)/g;

  for (const match of content.matchAll(linkRe)) {
    const raw = match[1].trim();
    if (!raw) continue;

    // Handle optional title: (path "title")
    const rawNoTitle = raw.startsWith('<') && raw.endsWith('>')
      ? raw.slice(1, -1)
      : raw.split(/\s+/)[0];

    if (
      rawNoTitle.startsWith('http://') ||
      rawNoTitle.startsWith('https://') ||
      rawNoTitle.startsWith('mailto:') ||
      rawNoTitle.startsWith('#')
    ) {
      continue;
    }

    const filePart = rawNoTitle.split('#')[0];
    if (!filePart) continue;
    if (!looksLikeLocalFileLink(filePart)) continue;

    const resolved = filePart.startsWith('./') || filePart.startsWith('../')
      ? path.resolve(path.dirname(docPath), filePart)
      : path.resolve(repoRoot, filePart);

    if (!fs.existsSync(resolved)) {
      errors.push(
        `${path.relative(repoRoot, docPath)}: broken link -> ${filePart} (resolved: ${path.relative(
          repoRoot,
          resolved,
        )})`,
      );
    }
  }

  return errors;
}

function main() {
  const errors = [];

  for (const docRel of REQUIRED_DOCS) {
    const docPath = path.resolve(repoRoot, docRel);
    if (!fs.existsSync(docPath)) {
      errors.push(`Missing required doc: ${docRel}`);
      continue;
    }

    const content = readFile(docPath);

    if (content.includes('/Users/')) {
      errors.push(
        `${docRel}: contains absolute path '/Users/...'. Use repo-relative paths (e.g. \`src/...\`)`,
      );
    }
    if (/[A-Za-z]:\\\\/.test(content)) {
      errors.push(
        `${docRel}: contains Windows absolute path 'C:\\\\...'. Use repo-relative paths`,
      );
    }

    errors.push(...checkMarkdownLinks(docPath, content));
  }

  if (errors.length) {
    console.error('Docs check failed:\n' + errors.map((e) => `- ${e}`).join('\n'));
    process.exit(1);
  }

  console.log('OK: docs');
}

main();
