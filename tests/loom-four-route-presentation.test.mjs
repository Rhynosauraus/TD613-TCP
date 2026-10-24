import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import {
  FLOWCORE_AIA_ROUTES,
  FLOWCORE_AIA_ROUTE_IDS,
  FLOWCORE_AIA_ROUTE_REGISTRY_SCHEMA
} from '../app/dome-world/data/flowcore-aia-route-registry-v01.js';
import {
  compilePedagogicalScene,
  compilePedagogicalTransition,
  compileRestState
} from '../app/engine/flowcore-pedagogue-core.js';

function loadPedagogueFixture() {
  const p = resolve('app/dome-world/fixtures/pedagogue/gluing-soft-fold.json');
  return JSON.parse(readFileSync(p, 'utf8'));
}

test('T-ROUTE-01: Flow-Core Four AIA Routes preserve identical lawful action sets and distinct non-equivalent projections', async () => {
  assert.equal(FLOWCORE_AIA_ROUTES.schema, FLOWCORE_AIA_ROUTE_REGISTRY_SCHEMA);
  assert.equal(FLOWCORE_AIA_ROUTES.selection, 'EXPLICIT_OPERATOR_SELECTION_ONLY');
  assert.equal(FLOWCORE_AIA_ROUTES.inference_forbidden, true);

  // Four canonical routes must all be present
  const expectedRoutes = ['EXPERIENTIAL', 'CUSTODIAL', 'AUDIT', 'IMPLEMENTATION'];
  assert.deepEqual(FLOWCORE_AIA_ROUTE_IDS, expectedRoutes);

  // Verify non-equivalence and invariant preservation across all four routes
  const requiredPreservations = [
    'provenance',
    'missingness',
    'contradiction',
    'claim ceiling',
    'station ownership',
    'authorized actions',
    'causal structure'
  ];

  for (const routeId of expectedRoutes) {
    const route = FLOWCORE_AIA_ROUTES.routes[routeId];
    assert.ok(route, `Route ${routeId} must be declared`);
    assert.ok(route.purpose && route.purpose.length > 0, `Route ${routeId} must define a distinct purpose`);
    assert.ok(Array.isArray(route.priorities) && route.priorities.length > 0, `Route ${routeId} must define priorities`);
    assert.deepEqual(route.required_preservations, requiredPreservations, `Route ${routeId} must preserve governed invariants`);
  }

  // Non-equivalence law: all 4 purposes must be distinct
  const purposes = expectedRoutes.map(id => FLOWCORE_AIA_ROUTES.routes[id].purpose);
  assert.equal(new Set(purposes).size, 4, 'All 4 routes must have distinct non-equivalent purposes');

  // Load valid base fixture for Flow-Core compilation
  const fixture = loadPedagogueFixture();
  const opts = { ...fixture.determinism, cryptoImpl: webcrypto };

  const scene = await compilePedagogicalScene(fixture.scene_input, opts);

  // Verify anisotropic legibility exposes all 4 routes with identical lawful action sets
  assert.deepEqual(scene.anisotropic_legibility.available_routes, expectedRoutes);
  assert.equal(scene.anisotropic_legibility.route_selection, 'EXPLICIT_OPERATOR_SELECTION_ONLY');
  assert.equal(scene.anisotropic_legibility.route_inference_forbidden, true);

  // Available affordances (lawful action sets) are identical across all route views
  assert.ok(scene.available_affordances.length > 0);
  for (const affordance of scene.available_affordances) {
    assert.ok(affordance.action_id);
    assert.ok(affordance.authorized_by_station);
  }

  // Authority ceilings: no route gains station authority
  assert.equal(scene.authority.flowcore_commands_station, false);
  assert.equal(scene.authority.automatic_ash_action, false);
  assert.equal(scene.authority.release_authorized, false);
  assert.equal(scene.authority.station_mutation_authorized, false);
  assert.equal(scene.authority.human_closure_required, true);
});

test('T-REST-01: Non-punitive rest and exit are strictly preserved without penalty or state loss', async () => {
  const fixture = loadPedagogueFixture();
  const opts = { ...fixture.determinism, cryptoImpl: webcrypto };

  const scene = await compilePedagogicalScene(fixture.scene_input, opts);

  // Scene guarantees rest and exit without penalty
  assert.equal(scene.rest.available, true);
  assert.equal(scene.rest.penalty, false);
  assert.equal(scene.rest.continuity_preserved, true);
  assert.equal(scene.exit.available, true);
  assert.equal(scene.exit.penalty, false);

  // Attempting to impose a penalty or remove rest fails closed
  const penalizedInput = JSON.parse(JSON.stringify(fixture.scene_input));
  penalizedInput.rest = { available: true, penalty: true };
  await assert.rejects(async () => {
    await compilePedagogicalScene(penalizedInput, opts);
  }, /removes rest, exit, or human closure/i);

  const noExitInput = JSON.parse(JSON.stringify(fixture.scene_input));
  noExitInput.exit = { available: false };
  await assert.rejects(async () => {
    await compilePedagogicalScene(noExitInput, opts);
  }, /removes rest, exit, or human closure/i);

  // Compile full transition cycle up to REST
  const notice = await compilePedagogicalTransition(scene, null, null, {
    ...opts,
    phase: 'NOTICE',
    staticEquivalent: { summary: 'Notice condition', steps: ['step1'] }
  });

  const act = await compilePedagogicalTransition(scene, fixture.action, null, {
    ...opts,
    phase: 'ACT',
    priorTransitions: [notice],
    staticEquivalent: { summary: 'Declared action', steps: ['step1'] }
  });

  const answer = await compilePedagogicalTransition(scene, fixture.action, fixture.world_delta, {
    ...opts,
    phase: 'WORLD_ANSWERS',
    priorTransitions: [notice, act]
  });

  const name = await compilePedagogicalTransition(scene, null, null, {
    ...opts,
    phase: 'NAME',
    priorTransitions: [notice, act, answer],
    name: fixture.name,
    staticEquivalent: { summary: 'Name relation', steps: ['step1'] }
  });

  const rest = await compilePedagogicalTransition(scene, null, null, {
    ...opts,
    phase: 'REST',
    priorTransitions: [notice, act, answer, name],
    staticEquivalent: { summary: 'Rest state', steps: ['step1'] }
  });

  // Compile rest state from transition
  const restState = await compileRestState(scene, rest, opts);
  assert.equal(restState.schema, 'td613.flowcore.rest-state/v0.1');
  assert.equal(restState.penalty, false);
  assert.equal(restState.content_erased, false);
  assert.equal(restState.continuity_preserved, true);
  assert.equal(restState.new_prompts_withheld, true);
  assert.equal(restState.recent_consequence_visible, true);
  assert.equal(restState.return_available, true);
  assert.equal(restState.exit_available, true);
  assert.equal(restState.closure.required, true);
  assert.equal(restState.closure.status, 'OPEN');
});
