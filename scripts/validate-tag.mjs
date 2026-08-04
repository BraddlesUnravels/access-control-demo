import { readFileSync } from 'node:fs';

const tag = process.argv[2];
const semanticVersionPattern =
  /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

if (!tag) {
  throw new Error('Release tag is required.');
}

if (!semanticVersionPattern.test(tag)) {
  throw new Error(`Release tag ${tag} is not a valid semantic version.`);
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
const expectedTag = `v${packageJson.version}`;

if (tag !== expectedTag) {
  throw new Error(
    `Release tag ${tag} does not match package version ${packageJson.version}.`,
  );
}

process.stdout.write(`Validated release tag ${tag}.\n`);
