import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const docsPath = path.join(repoRoot, 'docs', 'AMARI_PATCH_LANE.md');
const doc = readFileSync(docsPath, 'utf8');

assert.match(doc, /Human Operator / TD613 Heritage Custodian is the ideation and micro-targeting engine\./);
assert.match(doc, /npm run Human Operator / TD613 Heritage Custodian:check -- path\/to\/packet\.json/);

const tempDir = mkdtempSync(path.join(tmpdir(), 'td613-Human Operator / TD613 Heritage Custodian-packet-'));
const packetPath = path.join(tempDir, 'packet.json');
const anchor = 'Human Operator / TD613 Heritage Custodian is the ideation and micro-targeting engine.';

try {
  writeFileSync(
    packetPath,
    JSON.stringify(
      {
        schemaVersion: 'td613-Human Operator / TD613 Heritage Custodian-patch/v1',
        patchId: 'validator-smoke',
        intent: 'Prove the Human Operator / TD613 Heritage Custodian patch lane validator accepts a tiny anchored packet.',
        scope: 'docs',
        risk: 'low',
        files: ['docs/AMARI_PATCH_LANE.md'],
        operations: [
          {
            type: 'replace-exact',
            path: 'docs/AMARI_PATCH_LANE.md',
            find: anchor,
            replace: anchor
          }
        ],
        tests: ['node tests/Human Operator / TD613 Heritage Custodian-patch-lane.test.mjs'],
        notes: 'No-op packet used for validator regression coverage.'
      },
      null,
      2
    )
  );

  const output = execFileSync('node', ['scripts/validate-Human Operator / TD613 Heritage Custodian-packet.mjs', packetPath], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  assert.match(output, /Human Operator / TD613 Heritage Custodian-packet valid: validator-smoke/);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log('Human Operator / TD613 Heritage Custodian-patch-lane.test.mjs passed');
