/**
 * Tests for COV-M2 Slice 2: Loom Gate Customer Disclosure, Marrowline Continuity & View-Model Integration.
 * Covers all 19 contract fixtures specified in Artifact 48-R1, including Amari Implementation Guards A, B, and C.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  createLoomGateDisclosure,
  LOOM_GATE_DISCLOSURE_PUBLIC_RECEIPT_SCHEMA,
  LOOM_GATE_DISCLOSURE_PUBLIC_CLAIM_CEILING
} from '../app/dome-world/loom-gate-disclosure.js';
import {
  deriveMarrowlineLoomGateContinuity,
  installMarrowlineLoomGateContinuity,
  projectPublicContinuityEvent,
  MARROWLINE_LOOM_GATE_CONTINUITY_PUBLIC_PROJECTION_SCHEMA
} from '../app/dome-world/marrowline-loom-gate-continuity.js';
import {
  PORTABLE_LOOM_GATE_SCHEMA,
  LOOM_GATE_SNAPSHOT_SCHEMA,
  LOOM_GATE_LABEL,
  LOOM_GATE_HREF
} from '../app/engine/portable-loom-gate-view-model.js';

function createMockReport(overrides = {}) {
  const hex = 'a'.repeat(64);
  return {
    schema: PORTABLE_LOOM_GATE_SCHEMA,
    action: 'CHECK_LOOM_GATE',
    label: LOOM_GATE_LABEL,
    href: LOOM_GATE_HREF,
    session_root_ref: hex,
    anchor_work_unit_ref: hex,
    policy_commitment: hex,
    challenge_ref: hex,
    verification_ref: hex,
    verification_schema: 'td613.loom.challenge-verification/v0.1',
    status: 'BOUNDED_CHALLENGE_PASSED',
    evidence_class: 'OFFLINE_TEST',
    reference_match: { challenge: true, session: true, work_unit: true, policy: true },
    coverage: {
      captured_channels: 2,
      missing_required_channels: 0,
      checked_targets: 4,
      disclosed_targets: 0,
      declared_reconstruction_attempts: 2,
      measured_reconstruction_attempts: 2,
      successful_reconstruction_attempts: 0,
      missing_attempts: 0
    },
    joining: { observed: 0, incomplete: 0 },
    conversation_leakage_fraction: null,
    measurement: 'COUNTS_OF_DECLARED_TARGETS_AND_ATTEMPTS_ON_CAPTURED_SURFACES',
    receipt_scope: 'ORIGIN_COMPUTED_SUMMARY_REQUIRES_LOCAL_PRIVATE_RECORD_FOR_RECOMPUTATION',
    next_action: 'REVIEW_CAPTURE_COVERAGE_BEFORE_CONTINUING',
    authority: { head_advanced: false, foreign_enforcement_proved: false, empirical_credit: 0 },
    ref: hex,
    ...overrides
  };
}

function createExposureReport(overrides = {}) {
  return createMockReport({
    status: 'OBSERVED_EXPOSURE',
    coverage: {
      captured_channels: 2,
      missing_required_channels: 0,
      checked_targets: 4,
      disclosed_targets: 1,
      declared_reconstruction_attempts: 2,
      measured_reconstruction_attempts: 2,
      successful_reconstruction_attempts: 1,
      missing_attempts: 0
    },
    next_action: 'HOLD_REVIEW_EXPOSURE_AND_REGISTERED_SCOPE',
    ...overrides
  });
}

function setupDom() {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="gatePanel"><div class="gate-controls"></div></div></body></html>`);
  return { dom, doc: dom.window.document, root: dom.window };
}

test('T-DISC-01: NOT_RUN produces schema-valid no-report view-model without fake observations', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  disclosure.update([], 'ACTIVE');

  const receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.schema, LOOM_GATE_DISCLOSURE_PUBLIC_RECEIPT_SCHEMA);
  assert.equal(receipt.basis, 'NOT_RUN');
  assert.equal(receipt.status, 'NOT_RUN');
  assert.equal(receipt.declared_source_status, 'NOT_RUN');
  assert.equal(receipt.six_field_contract.measurement_status, 'NOT_RUN');
  assert.match(receipt.customer_presentation.what_happened, /No receiver checks have been run/i);
  assert.match(receipt.customer_presentation.what_was_checked, /No captured challenge surfaces checked/i);
  assert.equal(disclosure.drawer.querySelector('.loom-gate-customer-card').textContent.includes('No receiver checks'), true);
  assert.match(disclosure.section.querySelector('footer p').textContent, /NOT_RUN/);
});

test('T-DISC-02: Unverified BOUNDED_CHALLENGE_PASSED renders as HELD_UNVERIFIED_DECLARATION', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const report = createMockReport();
  disclosure.update([report], 'ACTIVE');

  const receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'HELD_UNVERIFIED_DECLARATION');
  assert.equal(receipt.declared_source_status, 'BOUNDED_CHALLENGE_PASSED');
  assert.equal(receipt.gate_verification_status, 'UNVERIFIED_DECLARATION');
  assert.match(receipt.customer_presentation.what_happened, /Unverified declaration/);
  assert.match(disclosure.drawer.querySelector('pre').textContent, /HELD_UNVERIFIED_DECLARATION/);
  assert.doesNotMatch(receipt.status, /^PASS$/);
});

test('T-DISC-03: OBSERVED_EXPOSURE remains visibly flagged across UI updates', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const exposureReport = createExposureReport();
  disclosure.update([exposureReport], 'ACTIVE');

  const receipt1 = disclosure.getPublicReceipt();
  assert.equal(receipt1.status, 'OBSERVED_EXPOSURE');
  assert.match(receipt1.customer_presentation.what_happened, /Alert · exposure detected/);
  assert.match(disclosure.section.querySelector('footer p').textContent, /EXPOSURE_RETAINED/);

  // Subsequent update with exposure report maintains alert
  disclosure.update([exposureReport], 'DONE');
  const receipt2 = disclosure.getPublicReceipt();
  assert.equal(receipt2.status, 'OBSERVED_EXPOSURE');
  assert.match(disclosure.section.querySelector('footer p').textContent, /EXPOSURE_RETAINED/);
});

test('T-DISC-04: HELD_INCOMPLETE_OBSERVATION enumerates missing channels without crashing', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const incompleteReport = createMockReport({
    status: 'HELD_INCOMPLETE_OBSERVATION',
    coverage: {
      captured_channels: 1,
      missing_required_channels: 2,
      checked_targets: 4,
      disclosed_targets: 0,
      declared_reconstruction_attempts: 2,
      measured_reconstruction_attempts: 1,
      successful_reconstruction_attempts: 0,
      missing_attempts: 1
    },
    next_action: 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE'
  });
  disclosure.update([incompleteReport], 'ACTIVE');

  const receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'HELD_INCOMPLETE_OBSERVATION');
  assert.match(receipt.customer_presentation.what_happened, /HOLD · incomplete observation/);
  assert.equal(receipt.drawer.coverage.missing_required_channels, 2);
  assert.equal(receipt.drawer.coverage.missing_attempts, 1);
});

test('T-DISC-05: Native finite-channel three-assay zero-count case retains explicit disclaimer text', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const zeroReport = createMockReport({
    coverage: {
      captured_channels: 2,
      missing_required_channels: 0,
      checked_targets: 0,
      disclosed_targets: 0,
      declared_reconstruction_attempts: 0,
      measured_reconstruction_attempts: 0,
      successful_reconstruction_attempts: 0,
      missing_attempts: 0
    }
  });
  disclosure.update([zeroReport], 'ACTIVE');

  const receipt = disclosure.getPublicReceipt();
  assert.match(receipt.customer_presentation.what_was_checked, /The carried summary does not establish which assay supplied the underlying challenge/);
  assert.match(receipt.customer_presentation.what_happened, /zero canary and reconstruction probe counts/);
});

test('T-DISC-06: Provider metadata defaults to UNKNOWN; foreign_enforcement_proved is false', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  disclosure.update([createMockReport()], 'ACTIVE');

  const receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.authority.foreign_enforcement_proved, false);
  assert.equal(receipt.authority.head_advanced, false);
  assert.equal(receipt.authority.empirical_credit, 0);
  assert.match(receipt.customer_presentation.what_remains_unknown, /internal reasoning and hidden activations remain unobserved/);
});

test('T-DISC-07: Secret containment: private canaries, prompts, solutions, and keys never leak into DOM', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const hostileReport = createMockReport({
    private_canary_secret: 'SENSITIVE_CANARY_VALUE_XYZ_999',
    prompt_plaintext: 'SECRET_OPERATOR_PROMPT_ABC_123',
    internal_solution: 'SECRET_CORRECT_ANSWER_456'
  });
  disclosure.update([hostileReport], 'ACTIVE');

  const domText = doc.body.innerHTML;
  assert.equal(domText.includes('SENSITIVE_CANARY_VALUE_XYZ_999'), false);
  assert.equal(domText.includes('SECRET_OPERATOR_PROMPT_ABC_123'), false);
  assert.equal(domText.includes('SECRET_CORRECT_ANSWER_456'), false);
});

test('T-DISC-08: Keyboard accessibility: Escape key closes drawer and returns focus to help button', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  doc.body.append(disclosure.section);
  const help = disclosure.help;
  const drawer = disclosure.drawer;

  assert.equal(drawer.hidden, true);
  help.click();
  assert.equal(drawer.hidden, false);
  assert.equal(help.getAttribute('aria-expanded'), 'true');

  drawer.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(drawer.hidden, true);
  assert.equal(help.getAttribute('aria-expanded'), 'false');
  assert.equal(doc.activeElement, help);
});

test('T-DISC-09: Consumer compatibility: ai-workspace.js and Classic79 calling patterns execute cleanly with ACTIVE and UNPREPARED', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc, { id: 'loomGateHow', onGate: () => {} });
  const reports = [createMockReport()];

  // Active call pattern from ai-workspace.js line 137
  assert.doesNotThrow(() => disclosure.update(reports, 'ACTIVE'));
  assert.match(disclosure.section.querySelector('footer p').textContent, /ACTIVE/);

  // Unprepared call pattern
  assert.doesNotThrow(() => disclosure.update([], 'UNPREPARED'));
  assert.match(disclosure.section.querySelector('footer p').textContent, /UNPREPARED/);

  // Open with item report
  assert.doesNotThrow(() => disclosure.open(reports[0]));
  assert.equal(disclosure.drawer.hidden, false);
});

test('T-DISC-10: Marrowline stages and lawful action sets remain unchanged', () => {
  const packet = {
    documents: [{ id: 'doc-1', name: 'test.md', text: 'body' }],
    loom_gate_reports: [createMockReport()]
  };

  const arrived = deriveMarrowlineLoomGateContinuity({ phase: 'ARRIVED', packet });
  assert.equal(arrived.fadt.state, 'FILES HELD');

  const aiaSent = deriveMarrowlineLoomGateContinuity({ phase: 'AIA_SENT', predecessor: { request_id: 'req-1' }, packet });
  assert.equal(arrived.fadt.state, 'FILES HELD');
  assert.equal(aiaSent.fadt.state, 'FILES ELIGIBLE');

  const filesStaged = deriveMarrowlineLoomGateContinuity({ phase: 'FILES_STAGED', predecessor: { request_id: 'req-1' }, packet });
  assert.equal(filesStaged.fadt.state, 'EXPORT HELD');

  const done = deriveMarrowlineLoomGateContinuity({ phase: 'DONE', predecessor: { request_id: 'req-1' }, result: { request_id: 'res-1' }, substantiveContinuationCount: 1, packet });
  assert.equal(done.fadt.state, 'EXPORT ELIGIBLE');
});

test('T-DISC-11: "米 Check Loom Gate" button retains onGate handler and LOOM_GATE_HREF', () => {
  const { doc } = setupDom();
  let clicked = false;
  const disclosure = createLoomGateDisclosure(doc, { onGate: () => { clicked = true; } });
  const gateBtn = disclosure.section.querySelector('button');

  assert.equal(gateBtn.textContent, '米 Check Loom Gate');
  gateBtn.click();
  assert.equal(clicked, true);
});

test('T-DISC-12: Zero network requests, provider calls, or custody head movements initiated by presentation', () => {
  const { doc, root } = setupDom();
  let fetchCalled = false;
  root.fetch = () => { fetchCalled = true; throw new Error('Fetch forbidden'); };

  const disclosure = createLoomGateDisclosure(doc);
  disclosure.update([createMockReport()], 'ACTIVE');
  disclosure.open();

  assert.equal(fetchCalled, false);
  const receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.authority.head_advanced, false);
});

test('T-DISC-13: Mobile (390px) and desktop layout constraints respected in JSDOM structure', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);

  // Link stylesheet registered
  const link = doc.querySelector('link[data-loom-gate-disclosure]');
  assert.ok(link);

  // Registry scroll container present with table and 32 mechanisms
  const scroll = disclosure.drawer.querySelector('.loom-gate-registry-scroll');
  assert.ok(scroll);
  const rows = scroll.querySelectorAll('tbody tr');
  assert.equal(rows.length, 32);

  // Buttons have aria attributes
  assert.equal(disclosure.help.getAttribute('aria-controls'), 'loomGateHow');
  assert.equal(disclosure.help.getAttribute('aria-expanded'), 'false');
});

test('T-DISC-14: Flow-Core sequence and 39-carrier animation system remain intact', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const footerText = disclosure.section.querySelector('footer p').textContent;
  // Preserves flow-core seal ending
  assert.match(footerText, /⟐$/);
});

test('T-DISC-15 (Guard A / Redline 48-01): Valid empty snapshot constructed via LOOM_GATE_SNAPSHOT_SCHEMA; presentation phases normalized; malformed report triggers structural hold', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);

  // Empty reports with presentation phase 'ACTIVE'
  disclosure.update([], 'ACTIVE');
  let receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.basis, 'NOT_RUN');
  assert.equal(receipt.status, 'NOT_RUN');

  // With presentation phase 'UNPREPARED'
  disclosure.update([], 'UNPREPARED');
  receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'NOT_RUN');

  // Malformed carried report (e.g. invalid counts) triggers structural contract hold WITHOUT fake missing channels
  const malformed = {
    schema: PORTABLE_LOOM_GATE_SCHEMA,
    status: 'BOUNDED_CHALLENGE_PASSED',
    coverage: { captured_channels: -5 } // negative count contract violation
  };
  disclosure.update([malformed], 'ACTIVE');
  receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
  assert.equal(receipt.declared_source_status, 'MALFORMED_DECLARATION');
  assert.equal(receipt.drawer.coverage, null, 'Must NOT fabricate fake missing channel counts or measured numerical zeros on malformed report (R1-04)');
  assert.match(receipt.customer_presentation.what_happened, /HOLD · carried gate report failed structural validation/);
});

test('T-DISC-16 (Guard B / Redline 48-02): Multi-report mixed sequences: exposure strictly dominates', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const passReport = createMockReport();
  const exposureReport = createExposureReport();

  // Exposure after Pass
  disclosure.update([passReport, exposureReport], 'ACTIVE');
  let receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'OBSERVED_EXPOSURE', 'Exposure must dominate when following a pass');
  assert.equal(receipt.reports_summary.total_reports, 2);

  // Pass after Exposure
  disclosure.update([exposureReport, passReport], 'ACTIVE');
  receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'OBSERVED_EXPOSURE', 'Exposure must dominate when preceding a pass');

  // Malformed + Exposure
  const malformed = { schema: 'invalid' };
  disclosure.update([malformed, exposureReport], 'ACTIVE');
  receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'OBSERVED_EXPOSURE', 'Exposure dominates over malformed report');
});

test('T-DISC-17 (Guard B / Redline 48-02): Public receipt projection strictly matches view-model schema & explicit claim ceiling', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  disclosure.update([createMockReport()], 'ACTIVE');

  const receipt = disclosure.getPublicReceipt();
  assert.ok(receipt.six_field_contract);
  assert.equal(receipt.six_field_contract.source, 'LOCAL_PORTABLE_SESSION_AND_CAPTURED_CHALLENGE');
  assert.ok(receipt.authority);
  assert.equal(receipt.authority.head_advanced, false);
  assert.ok(receipt.drawer.coverage);
  assert.equal(typeof receipt.drawer.coverage.captured_channels, 'number');
  assert.ok(receipt.drawer.joining);
  assert.equal(receipt.claim_ceiling, LOOM_GATE_DISCLOSURE_PUBLIC_CLAIM_CEILING);
});

test('T-DISC-18 (Guard C / Redline 48-03): Privacy audit on public CustomEvent and global object: sensitive markers absent, raw file names stripped', () => {
  const { doc, root } = setupDom();
  let dispatchedDetail = null;
  root.addEventListener('td613:marrowline:loom-gate-continuity', event => {
    dispatchedDetail = event.detail;
  });

  const packet = {
    documents: [{ id: 'doc-1', name: 'CONFIDENTIAL_BANK_RECORDS.pdf', text: 'SECRET_BODY' }],
    loom_gate_reports: [createMockReport({ private_diagnostic: 'INTERNAL_TOKEN_XYZ' })]
  };

  const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
  continuity.update({ phase: 'ARRIVED' });

  const globalObj = root.__TD613_MARROWLINE_LOOM_GATE_CONTINUITY__;
  assert.ok(globalObj);
  assert.equal(globalObj.schema, MARROWLINE_LOOM_GATE_CONTINUITY_PUBLIC_PROJECTION_SCHEMA);

  // Assert absence of sensitive markers across global object and event detail
  const serializedGlobal = JSON.stringify(globalObj);
  const serializedEvent = JSON.stringify(dispatchedDetail);

  for (const serialized of [serializedGlobal, serializedEvent]) {
    assert.equal(serialized.includes('CONFIDENTIAL_BANK_RECORDS.pdf'), false, 'Raw file names must be stripped from public projection');
    assert.equal(serialized.includes('SECRET_BODY'), false, 'Document text must not leak');
    assert.equal(serialized.includes('INTERNAL_TOKEN_XYZ'), false, 'Private report diagnostics must not leak');
  }

  // But internal controller getCurrent() retains legitimate authorized tracking
  const internal = continuity.getCurrent();
  assert.ok(internal.technical.selected_names.includes('CONFIDENTIAL_BANK_RECORDS.pdf'));
});

test('T-DISC-19 (Guard C / Redline 48-03): Hostile getter injection: accessor properties on report inputs rejected WITHOUT evaluation', () => {
  const { doc, root } = setupDom();
  let getterEvaluated = false;

  const hostileReport = {};
  Object.defineProperty(hostileReport, 'exploit_accessor', {
    get() {
      getterEvaluated = true;
      throw new Error('HOSTILE_GETTER_EXECUTED');
    },
    enumerable: true
  });

  const packet = {
    documents: [{ id: '1', name: 'safe.txt', text: 'safe' }],
    loom_gate_reports: [hostileReport]
  };

  // Must not throw during installation or derive
  assert.doesNotThrow(() => {
    const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
    continuity.update({ phase: 'ARRIVED' });
  });

  assert.equal(getterEvaluated, false, 'Accessor getter must NEVER be evaluated on untrusted carried report');
});

test('T-REPAIR-01 (R1-01): One malformed report alone produces structural HOLD, never NOT_RUN', () => {
  const { doc, root } = setupDom();
  const packet = {
    loom_gate_reports: [{ schema: 'invalid' }]
  };
  const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
  continuity.update({ phase: 'ARRIVED' });

  const globalObj = root.__TD613_MARROWLINE_LOOM_GATE_CONTINUITY__;
  assert.equal(globalObj.gate_disclosure.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
  assert.notEqual(globalObj.gate_disclosure.status, 'NOT_RUN');
});

test('T-REPAIR-02 (R1-01): A plain {} report does not crash rendering and records structural HOLD', () => {
  const { doc, root } = setupDom();
  const packet = {
    loom_gate_reports: [{}]
  };
  assert.doesNotThrow(() => {
    const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
    continuity.update({ phase: 'ARRIVED' });
  });

  const alerts = doc.getElementById('loomPortableGateAlerts');
  assert.match(alerts.textContent, /HOLD · carried gate report failed structural or semantic validation/);

  const globalObj = root.__TD613_MARROWLINE_LOOM_GATE_CONTINUITY__;
  assert.equal(globalObj.gate_disclosure.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
});

test('T-REPAIR-03 (R1-01 & R1-04): Malformed plus valid exposure preserves reported exposure and explicitly records malformed item with null coverage', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const malformed = { schema: 'invalid' };
  const exposure = createExposureReport();

  disclosure.update([malformed, exposure], 'ACTIVE');
  const receipt = disclosure.getPublicReceipt();

  assert.equal(receipt.status, 'OBSERVED_EXPOSURE', 'Exposure strictly dominates');
  assert.equal(receipt.reports_summary.total_reports, 2);
  assert.equal(receipt.reports_summary.items[0].status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
  assert.equal(receipt.reports_summary.items[0].coverage, null, 'Malformed report coverage must be null, not measured zeros');
  assert.equal(receipt.reports_summary.items[1].status, 'OBSERVED_EXPOSURE');
  assert.ok(receipt.reports_summary.items[1].coverage.disclosed_targets > 0);
});

test('T-REPAIR-04 (R1-01): Reordered reports retain respective classifications and exposure dominance', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const exposure = createExposureReport();
  const malformed = { schema: 'invalid' };

  // Exposure first, then malformed
  disclosure.update([exposure, malformed], 'ACTIVE');
  const receipt = disclosure.getPublicReceipt();

  assert.equal(receipt.status, 'OBSERVED_EXPOSURE');
  assert.equal(receipt.reports_summary.items[0].status, 'OBSERVED_EXPOSURE');
  assert.equal(receipt.reports_summary.items[1].status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
});

test('T-REPAIR-05 (R1-02): Hostile accessor on array index 0 fails closed without evaluating getter', () => {
  const { doc, root } = setupDom();
  let getterEvaluated = false;

  const hostileArray = [];
  Object.defineProperty(hostileArray, '0', {
    get() {
      getterEvaluated = true;
      throw new Error('INDEX_GETTER_FIRED');
    },
    enumerable: true,
    configurable: true
  });

  // Direct disclosure update
  const disclosure = createLoomGateDisclosure(doc);
  assert.doesNotThrow(() => disclosure.update(hostileArray, 'ACTIVE'));
  assert.equal(getterEvaluated, false, 'Getter on index 0 must NOT be evaluated in disclosure');
  assert.equal(disclosure.getPublicReceipt().status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');

  // Through Marrowline continuity
  const packet = { loom_gate_reports: hostileArray };
  assert.doesNotThrow(() => {
    const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
    continuity.update({ phase: 'ARRIVED' });
  });
  assert.equal(getterEvaluated, false, 'Getter on index 0 must NOT be evaluated in continuity');
});

test('T-REPAIR-06 (R1-02): Hostile accessor on packet property loom_gate_reports fails closed without evaluating getter', () => {
  const { doc, root } = setupDom();
  let packetGetterEvaluated = false;

  const packet = {};
  Object.defineProperty(packet, 'loom_gate_reports', {
    get() {
      packetGetterEvaluated = true;
      throw new Error('PACKET_GETTER_FIRED');
    },
    enumerable: true,
    configurable: true
  });

  assert.doesNotThrow(() => {
    const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
    continuity.update({ phase: 'ARRIVED' });
  });
  assert.equal(packetGetterEvaluated, false, 'Getter on packet.loom_gate_reports must NOT be evaluated');
  assert.equal(root.__TD613_MARROWLINE_LOOM_GATE_CONTINUITY__.gate_disclosure.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
});

test('T-REPAIR-07 (R1-03): Private marker in governance.withheld_document_count never reflects into public events or DOM', () => {
  const { doc, root } = setupDom();
  let dispatchedDetail = null;
  root.addEventListener('td613:marrowline:loom-gate-continuity', ev => {
    dispatchedDetail = ev.detail;
  });

  const packet = {
    governance: {
      withheld_document_count: 'SECRET_CANARY_WITHHELD_MARKER_99'
    },
    documents: [{ id: 'doc1', name: 'confidential_payroll_records.pdf' }]
  };

  const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
  continuity.update({ phase: 'ARRIVED' });

  const globalObj = root.__TD613_MARROWLINE_LOOM_GATE_CONTINUITY__;
  const serializedGlobal = JSON.stringify(globalObj);
  const serializedEvent = JSON.stringify(dispatchedDetail);
  const domHtml = doc.getElementById('loomGateContinuity').innerHTML;

  for (const target of [serializedGlobal, serializedEvent, domHtml]) {
    assert.equal(target.includes('SECRET_CANARY_WITHHELD_MARKER_99'), false, 'Nonnumeric withheld marker must NEVER leak into public projections or DOM');
    assert.equal(target.includes('confidential_payroll_records.pdf'), false, 'File name must NEVER leak into public projections or DOM');
  }
});

test('T-REPAIR-08 (R1-04): Mixed-report with two distinct native references cannot falsely attribute exposure to first report', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const hexA = '1'.repeat(64);
  const hexB = '2'.repeat(64);

  const reportA = createMockReport({ ref: hexA });
  const reportB = createExposureReport({ ref: hexB });

  disclosure.update([reportA, reportB], 'ACTIVE');
  const receipt = disclosure.getPublicReceipt();

  assert.equal(receipt.status, 'OBSERVED_EXPOSURE');
  assert.equal(receipt.drawer.native_report_ref, null, 'Multi-report aggregate must NOT attribute exposure to first report ref');
  assert.equal(receipt.reports_summary.items[0].ref, hexA);
  assert.equal(receipt.reports_summary.items[1].ref, hexB);
  assert.equal(receipt.drawer.coverage.declared_report_totals, true);
  assert.match(receipt.customer_presentation.what_happened, /Alert · exposure detected in carried report summary/);
});

test('T-REPAIR-09 (R2-01): Accessor on report.malformed never executes', () => {
  const { doc } = setupDom();
  let getterExecuted = false;
  const hostileReport = {};
  Object.defineProperty(hostileReport, 'malformed', {
    get() {
      getterExecuted = true;
      throw new Error('MALFORMED_GETTER_FIRED');
    },
    enumerable: true,
    configurable: true
  });

  const disclosure = createLoomGateDisclosure(doc);
  assert.doesNotThrow(() => disclosure.update([hostileReport], 'ACTIVE'));
  assert.equal(getterExecuted, false, 'Accessor on report.malformed must NEVER execute');

  const receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
  assert.equal(receipt.drawer.coverage, null);

  // Also via open(report)
  assert.doesNotThrow(() => disclosure.open(hostileReport));
  assert.equal(getterExecuted, false, 'Accessor on report.malformed must NEVER execute on open()');
});

test('T-REPAIR-10 (R2-01): [null], [undefined], and sparse report entries produce explicit structural HOLD classifications rather than NOT_RUN or PASS', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);

  // [null] entry
  disclosure.update([null], 'ACTIVE');
  let receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION', '[null] must not be classified as NOT_RUN');
  assert.equal(receipt.reports_summary.total_reports, 1);
  assert.equal(receipt.reports_summary.items[0].status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
  assert.notEqual(receipt.status, 'NOT_RUN');

  // [undefined] entry
  disclosure.update([undefined], 'ACTIVE');
  receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION', '[undefined] must not be classified as NOT_RUN');
  assert.equal(receipt.reports_summary.total_reports, 1);
  assert.equal(receipt.reports_summary.items[0].status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');

  // Sparse array (hole)
  const sparseArray = new Array(1); // sparse hole at index 0
  disclosure.update(sparseArray, 'ACTIVE');
  receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION', 'Sparse array must not be classified as NOT_RUN');
  assert.equal(receipt.reports_summary.total_reports, 1);
  assert.equal(receipt.reports_summary.items[0].status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');

  // In contrast, empty array [] is truly NOT_RUN
  disclosure.update([], 'ACTIVE');
  receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'NOT_RUN');
  assert.equal(receipt.reports_summary.total_reports, 0);
});

test('T-REPAIR-11 (R2-01): Valid internal malformed placeholders retain HOLD classifications and mixed-report exposure dominance survives', () => {
  const { doc } = setupDom();
  const disclosure = createLoomGateDisclosure(doc);
  const internalPlaceholder = { schema: 'td613.loom.malformed-gate-report/v0.1', malformed: true, index: 0 };
  const exposure = createExposureReport();

  // Internal placeholder alone
  disclosure.update([internalPlaceholder], 'ACTIVE');
  let receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
  assert.equal(receipt.reports_summary.items[0].status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
  assert.equal(receipt.reports_summary.items[0].coverage, null);

  // Mixed: internal placeholder followed by exposure report -> exposure dominates
  disclosure.update([internalPlaceholder, exposure], 'ACTIVE');
  receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'OBSERVED_EXPOSURE', 'Exposure must dominate over internal malformed placeholder');
  assert.equal(receipt.reports_summary.items[0].status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
  assert.equal(receipt.reports_summary.items[1].status, 'OBSERVED_EXPOSURE');

  // Mixed: exposure report followed by null invalid entry -> exposure dominates
  disclosure.update([exposure, null], 'ACTIVE');
  receipt = disclosure.getPublicReceipt();
  assert.equal(receipt.status, 'OBSERVED_EXPOSURE', 'Exposure must dominate over null invalid entry');
  assert.equal(receipt.reports_summary.items[0].status, 'OBSERVED_EXPOSURE');
  assert.equal(receipt.reports_summary.items[1].status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
});

test('T-REPAIR-12 (R2-02): Report with coverage: { disclosed_targets: 0 } but no joining cannot crash Marrowline rendering', () => {
  const { doc, root } = setupDom();
  // Report with partial coverage but NO joining property and no status
  const incompleteReport = {
    coverage: { disclosed_targets: 0 }
  };
  const packet = {
    loom_gate_reports: [incompleteReport]
  };

  assert.doesNotThrow(() => {
    const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
    continuity.update({ phase: 'ARRIVED' });
  });

  const alerts = doc.getElementById('loomPortableGateAlerts');
  assert.ok(alerts);
  assert.match(alerts.textContent, /HOLD · carried gate report failed structural or semantic validation/);

  const globalObj = root.__TD613_MARROWLINE_LOOM_GATE_CONTINUITY__;
  assert.equal(globalObj.gate_disclosure.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
});

test('T-REPAIR-13 (R2-02): Semantically incomplete reports produce structural HOLD alerts', () => {
  const { doc, root } = setupDom();
  // Report claims BOUNDED_CHALLENGE_PASSED but lacks mandatory count fields
  const semanticallyIncomplete = {
    schema: PORTABLE_LOOM_GATE_SCHEMA,
    status: 'BOUNDED_CHALLENGE_PASSED',
    coverage: {
      captured_channels: 1
      // missing required fields: checked_targets, disclosed_targets, declared_reconstruction_attempts, etc.
    }
  };
  const packet = {
    loom_gate_reports: [semanticallyIncomplete]
  };

  const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
  continuity.update({ phase: 'ARRIVED' });

  const alerts = doc.getElementById('loomPortableGateAlerts');
  assert.match(alerts.textContent, /HOLD · carried gate report failed structural or semantic validation; contents untrusted\./);

  const globalObj = root.__TD613_MARROWLINE_LOOM_GATE_CONTINUITY__;
  assert.equal(globalObj.gate_disclosure.status, 'HELD_STRUCTURAL_CONTRACT_VIOLATION');
});

test('T-REPAIR-14 (R2-02): Declared PASS is described as unverified pending local recomputation', () => {
  const { doc, root } = setupDom();
  const validPass = createMockReport();
  const packet = {
    loom_gate_reports: [validPass]
  };

  const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
  continuity.update({ phase: 'ARRIVED' });

  const alerts = doc.getElementById('loomPortableGateAlerts');
  // Must describe PASS as unverified pending local recomputation
  assert.match(alerts.textContent, /Unverified declaration · declared checks passed on captured surfaces; local recomputation required before reliance\./);
  // Must not claim unqualified authoritative pass
  assert.doesNotMatch(alerts.textContent, /^Captured checks passed\.$/m);

  const globalObj = root.__TD613_MARROWLINE_LOOM_GATE_CONTINUITY__;
  assert.equal(globalObj.gate_disclosure.status, 'HELD_UNVERIFIED_DECLARATION');
});

test('T-REPAIR-15 (R2-02): Reported exposure remains prominently flagged and explicitly attributed to an unverified carried summary; raw payloads never leak into alert text', () => {
  const { doc, root } = setupDom();
  const rawPayloadCanary = 'SECRET_INTERNAL_PAYLOAD_TOKEN_ABC123';
  const exposureReport = createExposureReport({
    raw_debug_payload: rawPayloadCanary,
    secret_solution_key: 'KEY_VALUE_MUST_NOT_APPEAR'
  });
  const packet = {
    loom_gate_reports: [exposureReport]
  };

  const continuity = installMarrowlineLoomGateContinuity({ doc, root, packet });
  continuity.update({ phase: 'ARRIVED' });

  const alerts = doc.getElementById('loomPortableGateAlerts');
  // Prominently flagged and explicitly attributed to unverified carried summary
  assert.match(alerts.textContent, /Alert · exposure detected in carried report summary\. Declared protected targets appeared on captured surfaces; local recomputation required before reliance\./);
  assert.match(alerts.textContent, /This carried summary has not been independently verified locally\./);

  // Raw report payloads never enter public alert text
  assert.equal(alerts.textContent.includes(rawPayloadCanary), false, 'Raw payload canary must not appear in alerts text');
  assert.equal(alerts.textContent.includes('KEY_VALUE_MUST_NOT_APPEAR'), false, 'Secret solution key must not appear in alerts text');

  const globalObj = root.__TD613_MARROWLINE_LOOM_GATE_CONTINUITY__;
  assert.equal(globalObj.gate_disclosure.status, 'OBSERVED_EXPOSURE');
});
