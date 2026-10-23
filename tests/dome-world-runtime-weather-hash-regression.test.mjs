import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

function loadDomeCore() {
  const html = fs.readFileSync('app/dome-world/index.html', 'utf8');
  const scriptMatch = html.match(/(const DomeCore = \(\(\) => \{[\s\S]*?\n\}\)\(\);)/);
  if (!scriptMatch) throw new Error('Failed to extract DomeCore from app/dome-world/index.html');
  const code = scriptMatch[1].replace('const DomeCore =', 'this.DomeCore =');
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.DomeCore;
}

test('Dome-World: Numeric fold-density concordance in repo weather', () => {
  const C = loadDomeCore();
  const world = C.createWorld({ seed: 'weather-test' });

  // Test quantizeWeather thresholds: .66 and .33
  assert.equal(C.quantizeWeather({ fold_density: 0.85 }).fold_density, 'high');
  assert.equal(C.quantizeWeather({ fold_density: 0.67 }).fold_density, 'high');
  assert.equal(C.quantizeWeather({ fold_density: 0.66 }).fold_density, 'moderate');
  assert.equal(C.quantizeWeather({ fold_density: 0.50 }).fold_density, 'moderate');
  assert.equal(C.quantizeWeather({ fold_density: 0.34 }).fold_density, 'moderate');
  assert.equal(C.quantizeWeather({ fold_density: 0.33 }).fold_density, 'low');
  assert.equal(C.quantizeWeather({ fold_density: 0.10 }).fold_density, 'low');

  // Verify computeRepoWeather on a baseline world derives repo_weather strictly from state
  const baseline = C.computeRepoWeather(world);
  assert.equal(baseline.repo_weather, 'settled with watchfulness');
  assert.equal(baseline.dominant_fold, 'memory/pattern-flow');

  // Verify high fold density world state + quarantine raises pressure above .72 -> 'pressure rising'
  for (const room of Object.keys(world.local_sections)) {
    const isEven = Object.keys(world.local_sections).indexOf(room) % 2 === 0;
    world.local_sections[room].ambiance = {
      pressure: isEven ? 1.0 : 0.0,
      humidity: isEven ? 0.0 : 1.0,
      torsion: isEven ? 1.0 : 0.0,
      rest: isEven ? 0.0 : 1.0,
      pattern_flow: isEven ? 1.0 : 0.0,
      visibility: isEven ? 0.0 : 1.0
    };
    world.local_sections[room].boundaries = { anti_equivalence: ['a≠b', 'c≠d', 'e≠f', 'g≠h', 'i≠j'] };
  }
  world.stewardship.quarantined_count = 1;
  const rising = C.computeRepoWeather(world);
  assert.equal(rising.repo_weather, 'pressure rising');
  assert.equal(rising.quarantined_items, 1);
});

test('Dome-World: Hostile caller weather override rejection & non-finite weather guards', () => {
  const C = loadDomeCore();
  const world = C.createWorld({ seed: 'hostile-test' });

  // Condition B: Caller injection of opts.weather must be strictly ignored
  const injectedHigh = C.computeRepoWeather(world, { weather: { fold_density: 0.99 } });
  const injectedLow = C.computeRepoWeather(world, { weather: { fold_density: 0.01 } });
  const unadulterated = C.computeRepoWeather(world);

  assert.equal(injectedHigh.repo_weather, unadulterated.repo_weather, 'Hostile caller weather override must be ignored');
  assert.equal(injectedLow.repo_weather, unadulterated.repo_weather, 'Hostile caller weather override must be ignored');

  // Direct unit test of quantizeWeather non-finite and string handling
  assert.equal(C.quantizeWeather({ fold_density: NaN }).fold_density, 'low');
  assert.equal(C.quantizeWeather({ fold_density: Infinity }).fold_density, 'low');
  assert.equal(C.quantizeWeather({ fold_density: -Infinity }).fold_density, 'low');
  assert.equal(C.quantizeWeather({ fold_density: 'typhoon' }).fold_density, 'low');
  assert.equal(C.quantizeWeather({ fold_density: null }).fold_density, 'low');
  assert.equal(C.quantizeWeather({ fold_density: undefined }).fold_density, 'low');
  assert.equal(C.quantizeWeather({ fold_density: 'high' }).fold_density, 'high');
  assert.equal(C.quantizeWeather({ fold_density: 'moderate' }).fold_density, 'moderate');
  assert.equal(C.quantizeWeather({ fold_density: 'low' }).fold_density, 'low');
});

test('Dome-World: Versioned short-hash labeling across transmission seeds and event logs', () => {
  const C = loadDomeCore();
  let world = C.createWorld({ seed: 'hash-test' });

  world = C.applyFlowEvent(world, {
    operator: 'transmission',
    payload: { text: 'Relational memory woven from passage' }
  });

  const lastSeed = world.loom.seeds.at(-1);
  assert.ok(lastSeed, 'Seed should be created');
  assert.match(lastSeed.raw_hash, /^fnv32:[0-9a-f]{8}$/, 'New seeds must be prefixed with fnv32: and contain 8 hex chars');

  const lastEvent = world.event_log.at(-1);
  assert.ok(lastEvent, 'Event should be logged');
  assert.equal(lastEvent.schema, 'flowcore.ambiance.event/v0.4', 'Schema must be flowcore.ambiance.event/v0.4');
  assert.match(lastEvent.payload_hash, /^fnv32:[0-9a-f]{8}$/, 'New event payload hashes must be prefixed with fnv32:');

  // Verify cloth slice(-8) compatibility
  assert.equal(lastSeed.raw_hash.slice(-8).length, 8);
  assert.match(lastSeed.raw_hash.slice(-8), /^[0-9a-f]{8}$/);
});

test('Dome-World: Historical event replay and legacy decoder compatibility', () => {
  const C = loadDomeCore();

  // Test parseAmbianceHash decoder for valid fnv32:8-hex
  const parsedFnv = C.parseAmbianceHash('fnv32:3f8a1c9e');
  assert.equal(parsedFnv.algorithm, 'fnv32');
  assert.equal(parsedFnv.hash, '3f8a1c9e');
  assert.equal(parsedFnv.format_recognized, true);
  assert.equal(parsedFnv.cryptographic_attestation, false);
  assert.equal(parsedFnv.recomputed_integrity_verified, false);
  assert.equal(parsedFnv.legacy, false);

  // Test parseAmbianceHash decoder for legacy sha256:8-hex
  const parsedLegacySha = C.parseAmbianceHash('sha256:3f8a1c9e');
  assert.equal(parsedLegacySha.algorithm, 'fnv32');
  assert.equal(parsedLegacySha.hash, '3f8a1c9e');
  assert.equal(parsedLegacySha.format_recognized, true);
  assert.equal(parsedLegacySha.cryptographic_attestation, false);
  assert.equal(parsedLegacySha.recomputed_integrity_verified, false);
  assert.equal(parsedLegacySha.legacy, true);

  // Test parseAmbianceHash decoder for real 64-hex sha256
  const realSha = 'a'.repeat(64);
  const parsedRealSha = C.parseAmbianceHash(`sha256:${realSha}`);
  assert.equal(parsedRealSha.algorithm, 'sha256');
  assert.equal(parsedRealSha.hash, realSha);
  assert.equal(parsedRealSha.format_recognized, true);
  assert.equal(parsedRealSha.cryptographic_attestation, false);
  assert.equal(parsedRealSha.recomputed_integrity_verified, false);
  assert.equal(parsedRealSha.legacy, false);

  // Hostile malformed hash test cases (Condition A)
  const badFnvHex = C.parseAmbianceHash('fnv32:nothex!!');
  assert.equal(badFnvHex.algorithm, 'fnv32');
  assert.equal(badFnvHex.format_recognized, false);
  assert.equal(badFnvHex.cryptographic_attestation, false);

  const shortFnv = C.parseAmbianceHash('fnv32:123');
  assert.equal(shortFnv.algorithm, 'fnv32');
  assert.equal(shortFnv.format_recognized, false);

  const badSha = C.parseAmbianceHash('sha256:too-short-or-bad');
  assert.equal(badSha.algorithm, 'sha256');
  assert.equal(badSha.format_recognized, false);
  assert.equal(badSha.cryptographic_attestation, false);

  const nonHex64Sha = C.parseAmbianceHash('sha256:' + 'g'.repeat(64));
  assert.equal(nonHex64Sha.algorithm, 'sha256');
  assert.equal(nonHex64Sha.format_recognized, false);

  const parsedUnknown = C.parseAmbianceHash('md5:unrecognized');
  assert.equal(parsedUnknown.algorithm, 'unknown');
  assert.equal(parsedUnknown.format_recognized, false);
  assert.equal(parsedUnknown.cryptographic_attestation, false);

  const nullHash = C.parseAmbianceHash(null);
  assert.equal(nullHash.algorithm, 'unknown');
  assert.equal(nullHash.format_recognized, false);

  const numHash = C.parseAmbianceHash(12345);
  assert.equal(numHash.algorithm, 'unknown');
  assert.equal(numHash.format_recognized, false);

  // Replaying a world containing legacy v0.3 records
  const legacyWorld = C.createWorld({ seed: 'legacy' });
  legacyWorld.loom.seeds.push({
    raw_hash: 'sha256:1e6ac701',
    room: 'loom',
    age: 1,
    resonance: 0.22,
    privacy_class: 'room-scoped'
  });
  legacyWorld.event_log.push({
    schema: 'flowcore.ambiance.event/v0.3',
    event_id: 'evt_legacy01',
    day: 1,
    room: 'loom',
    operator: 'transmission',
    payload_hash: 'sha256:1e6ac701',
    anti_equivalence: [],
    holonomy_delta: 0.1,
    gate: null,
    ash: null,
    claim_ceiling: 'historical-event'
  });

  // Verify legacy seed rendering slice(-8)
  assert.equal(legacyWorld.loom.seeds[0].raw_hash.slice(-8), '1e6ac701');

  // Verify legacy decoding
  const decodedLegacySeed = C.parseAmbianceHash(legacyWorld.loom.seeds[0].raw_hash);
  assert.equal(decodedLegacySeed.legacy, true);
  assert.equal(decodedLegacySeed.hash, '1e6ac701');
  assert.equal(decodedLegacySeed.format_recognized, true);

  // Apply a new event on top of legacy world
  const updatedWorld = C.applyFlowEvent(legacyWorld, {
    operator: 'transmission',
    payload: { text: 'New event after legacy state' }
  });

  assert.equal(updatedWorld.event_log[0].schema, 'flowcore.ambiance.event/v0.3');
  assert.equal(updatedWorld.event_log[0].payload_hash, 'sha256:1e6ac701');
  assert.equal(updatedWorld.event_log[1].schema, 'flowcore.ambiance.event/v0.4');
  assert.match(updatedWorld.event_log[1].payload_hash, /^fnv32:[0-9a-f]{8}$/);
});

test('Dome-World: Ash signature noncryptographic content_hash limitation', () => {
  const C = loadDomeCore();
  const sig = C.computeAshSignature({
    text: 'Confidential research notes',
    salt: 'world-salt-123'
  });

  assert.match(sig.content_hash, /^salted:[0-9a-f]{8}$/);
  assert.equal(sig.content_hash_algorithm, 'fnv32-noncryptographic-surrogate');
  assert.match(sig.content_hash_limitation, /does not guarantee collision resistance or prevent dictionary reconstruction/);
});
