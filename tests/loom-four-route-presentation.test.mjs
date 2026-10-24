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
import {
  AIA_ROUTE_IDS,
  compileAIAView,
  compareAIAViews,
  verifyAIAInvariants
} from '../app/engine/flowcore-pedagogue-aia.js';

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
  assert.deepEqual(AIA_ROUTE_IDS, expectedRoutes);

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

  // Compile transition to execute Flow-Core AIA presentation compiler
  const notice = await compilePedagogicalTransition(scene, null, null, {
    ...opts,
    phase: 'NOTICE',
    staticEquivalent: { summary: 'Notice condition', steps: ['step1'] }
  });

  // Compile all four canonical AIA route views
  const views = [];
  for (const routeId of expectedRoutes) {
    views.push(await compileAIAView(scene, notice, routeId, opts));
  }
  assert.equal(views.length, 4, 'All four canonical AIA route views must be compiled');

  // Assert identical lawful action sets across all views
  for (const view of views) {
    assert.deepEqual(
      view.authorized_actions,
      views[0].authorized_actions,
      `Route ${view.route} must have identical lawful action sets to other views`
    );
  }

  // Assert identical, bounded, non-widened authority across all views
  for (const view of views) {
    assert.equal(view.authority.flowcore_commands_station, false);
    assert.equal(view.authority.automatic_ash_action, false);
    assert.equal(view.authority.release_authorized, false);
    assert.equal(view.authority.station_mutation_authorized, false);
    assert.equal(view.authority.authority_may_cross, false);
    assert.equal(view.authority.human_closure_required, true);
    assert.equal(view.closure.status, 'OPEN');
    assert.equal(view.closure.closed_by, null);
  }

  // Assert non-punitive Rest and Exit preserved without penalty on all views
  for (const view of views) {
    assert.equal(view.rest.available, true);
    assert.equal(view.rest.penalty, false);
    assert.equal(view.rest.continuity_preserved, true);
    assert.equal(view.exit.available, true);
    assert.equal(view.exit.penalty, false);
  }

  // Assert distinct, non-equivalent presentation surfaces across all views
  const surfaces = views.map(v => JSON.stringify(v.surface));
  assert.equal(new Set(surfaces).size, 4, 'All four AIA route views must have distinct non-equivalent surfaces');

  // Execute compareAIAViews across all 6 pairs (4 choose 2 = 6)
  let comparisonCount = 0;
  for (let i = 0; i < views.length; i++) {
    for (let j = i + 1; j < views.length; j++) {
      const comparison = compareAIAViews(views[i], views[j]);
      comparisonCount++;
      assert.equal(comparison.schema, 'td613.aia.view-comparison/v0.1');
      assert.equal(comparison.same_governed_transition, true);
      assert.equal(comparison.invariants_preserved, true, `${comparison.left_route} vs ${comparison.right_route} must preserve all invariants`);
      assert.equal(comparison.surfaces_non_equivalent, true, `${comparison.left_route} vs ${comparison.right_route} must be non-equivalent`);
      assert.equal(comparison.authority_equal_and_bounded, true, `${comparison.left_route} vs ${comparison.right_route} authority must be equal and bounded`);
      assert.equal(comparison.rest_and_exit_preserved, true, `${comparison.left_route} vs ${comparison.right_route} must preserve rest and exit`);
      assert.deepEqual(comparison.invariant_mismatches, []);
    }
  }
  assert.equal(comparisonCount, 6, 'Must execute exactly six pairwise route comparisons');

  // Execute verifyAIAInvariants to verify the complete four-view bundle
  const report = verifyAIAInvariants(scene, views);
  assert.equal(report.schema, 'td613.aia.invariant-report/v0.1');
  assert.equal(report.scene_reference, scene.scene_id);
  assert.equal(report.pair_count, 6);
  assert.equal(report.all_invariants_preserved, true);
  assert.equal(report.all_surfaces_non_equivalent, true);
  assert.equal(report.route_inference_forbidden, true);
  assert.equal(report.authority_transferred, false);
  assert.equal(report.human_closure_required, true);
  assert.equal(report.closure.status, 'OPEN');

  // Independent Route-Authority Reference and Station Affordance Verification (R2-03)
  const act = await compilePedagogicalTransition(scene, fixture.action, null, {
    ...opts,
    phase: 'ACT',
    priorTransitions: [notice],
    staticEquivalent: { summary: 'Declared action', steps: ['step1'] }
  });

  const actViews = [];
  for (const routeId of expectedRoutes) {
    actViews.push(await compileAIAView(scene, act, routeId, opts));
  }

  const stationAuthorizedActions = new Set(
    scene.available_affordances.map(a => `${a.authorized_by_station}:${a.action_id}`)
  );

  // Independent assertion: every compiled route's authorized actions match the governed transition station-authorized set
  for (const view of actViews) {
    assert.deepEqual(
      view.authorized_actions,
      act.authorized_actions,
      `Route ${view.route} authorized actions must match governed transition station-authorized actions`
    );
    for (const action of view.authorized_actions) {
      assert.ok(
        stationAuthorizedActions.has(action),
        `Action ${action} in route ${view.route} must be station-authorized by the scene affordances`
      );
    }
  }

  // Legitimate act views pass native invariant verification
  const actReport = verifyAIAInvariants(scene, actViews);
  assert.equal(actReport.all_invariants_preserved, true);
  assert.equal(actReport.authority_transferred, false);

  // Negative Counterexample 1: uniformly widened action set fails native verification even under unanimous 4-route agreement
  const uniformlyWidenedViews = actViews.map(v => {
    const cloned = JSON.parse(JSON.stringify(v));
    cloned.authorized_actions.push('Dome-World:unauthorized_mutation');
    cloned.invariants.authorized_actions.push('Dome-World:unauthorized_mutation');
    return cloned;
  });

  // Mutual agreement holds pairwise across the widened views
  const widenedPair = compareAIAViews(uniformlyWidenedViews[0], uniformlyWidenedViews[1]);
  assert.equal(widenedPair.invariants_preserved, true, 'Widened views agree with each other on the widened invariant');

  // But native verification fails closed: rejects unauthorized action despite unanimous agreement
  assert.throws(() => {
    verifyAIAInvariants(scene, uniformlyWidenedViews);
  }, /AIA view contains unauthorized action: Dome-World:unauthorized_mutation/);

  // Negative Counterexample 2: split-representation bundle fails native verification (top-level vs invariant mismatch)
  const splitTopViews = actViews.map(v => {
    const cloned = JSON.parse(JSON.stringify(v));
    cloned.authorized_actions.push('Dome-World:split_action');
    return cloned;
  });
  assert.throws(() => {
    verifyAIAInvariants(scene, splitTopViews);
  }, /action representation split between top-level and invariants/);

  const splitInvViews = actViews.map(v => {
    const cloned = JSON.parse(JSON.stringify(v));
    cloned.invariants.authorized_actions.push('Dome-World:split_action');
    return cloned;
  });
  assert.throws(() => {
    verifyAIAInvariants(scene, splitInvViews);
  }, /action representation split between top-level and invariants/);

  // Widened station authority flags fail validation closed even under unanimous view agreement
  const authorityWidenedViews = uniformlyWidenedViews.map(v => {
    const cloned = JSON.parse(JSON.stringify(v));
    cloned.authority.station_mutation_authorized = true;
    return cloned;
  });
  assert.throws(() => {
    verifyAIAInvariants(scene, authorityWidenedViews);
  }, /AIA view widened authority/);

  // Compiling transition with an unauthorized action directly fails closed
  const unauthorizedAction = { action_id: 'unauthorized_mutation', authorized_by_station: 'Dome-World' };
  await assert.rejects(async () => {
    await compilePedagogicalTransition(scene, unauthorizedAction, null, {
      ...opts,
      phase: 'ACT',
      priorTransitions: [notice],
      staticEquivalent: { summary: 'Declared action', steps: ['step1'] }
    });
  }, /Action is not declared by the scene/);
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
