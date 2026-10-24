import { LOOM_GATE_EXPLANATION } from '../engine/portable-loom-gate-explanation.js';
import { PORTABLE_LOOM_MECHANISMS } from '../engine/portable-loom-mechanisms.js';
import { portableLoomFooterText } from '../engine/portable-loom-output.js';
import {
  LOOM_GATE_SNAPSHOT_SCHEMA,
  LOOM_GATE_VIEW_MODEL_SCHEMA,
  deriveLoomGateViewModel,
  validateStructureDeep,
  PHASE_ALLOWLIST,
  LOOM_GATE_LABEL,
  LOOM_GATE_HREF
} from '../engine/portable-loom-gate-view-model.js';

export const LOOM_GATE_DISCLOSURE_PUBLIC_RECEIPT_SCHEMA = 'td613.loom.gate-disclosure-public-receipt/v0.1';
export const LOOM_GATE_DISCLOSURE_PUBLIC_CLAIM_CEILING =
  'public-presentation-and-continuity-witness; does-not-prove-foreign-enforcement-or-cryptographic-authenticity; zero-empirical-credit';

const el = (doc, tag, text = '', className = '') => {
  const node = doc.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
};

/**
 * Normalizes caller presentation phases (e.g. 'ACTIVE', 'UNPREPARED') into
 * the Slice 1 PHASE_ALLOWLIST enum (or 'UNKNOWN') to preserve caller compatibility (Guard A).
 */
function normalizePhaseForSnapshot(phase) {
  if (typeof phase === 'string' && PHASE_ALLOWLIST.includes(phase)) {
    return phase;
  }
  return 'UNKNOWN';
}

/**
 * Validates report container and its property descriptors before iteration or spreading (R1-02).
 * Fails closed without evaluating hostile getters on array indices.
 */
function validateReportsContainer(reports) {
  if (reports == null) return [];
  if (!Array.isArray(reports)) {
    return [reports];
  }
  if (reports.length > 100) {
    throw new TypeError('Carried reports array exceeds maximum limit of 100 items');
  }
  for (let i = 0; i < reports.length; i++) {
    const desc = Object.getOwnPropertyDescriptor(reports, String(i));
    if (desc && (desc.get || desc.set)) {
      throw new TypeError(`Hostile accessor detected on reports array index ${i}`);
    }
  }
  const safeList = [];
  for (let i = 0; i < reports.length; i++) {
    safeList.push(reports[i]);
  }
  return safeList;
}

/**
 * Safely derives a Slice 1 view-model from an individual carried report or returns a schema-valid NOT_RUN
 * view-model when no report is present. If the report fails structural validation, emits an explicit
 * HELD_STRUCTURAL_CONTRACT_VIOLATION with null coverage rather than fake zeros (R1-01, R1-04).
 */
function deriveIndividualReportViewModel(report, phase) {
  const normalizedPhase = normalizePhaseForSnapshot(phase);
  if (!report) {
    const snapshot = {
      schema: LOOM_GATE_SNAPSHOT_SCHEMA,
      session: { phase: normalizedPhase }
    };
    return deriveLoomGateViewModel(snapshot);
  }
  if (report.malformed) {
    return Object.freeze({
      schema: LOOM_GATE_VIEW_MODEL_SCHEMA,
      action: 'CHECK_LOOM_GATE',
      label: LOOM_GATE_LABEL,
      href: LOOM_GATE_HREF,
      declared_source_status: 'MALFORMED_DECLARATION',
      status: 'HELD_STRUCTURAL_CONTRACT_VIOLATION',
      gate_verification_status: 'UNVERIFIED_DECLARATION',
      customer_presentation: Object.freeze({
        what_happened: 'HOLD · carried gate report failed structural validation.',
        what_was_checked: 'Carried summary violated structural contract rules; contents untrusted.',
        what_remains_unknown: 'The model provider’s internal reasoning and hidden activations remain unobserved. Downstream retention, fine-tuning use, or training storage is not measured. Conversation leakage fraction is unmeasured (null).',
        what_happens_next: 'HOLD · repair or regenerate valid challenge report before relying on gate status.'
      }),
      six_field_contract: Object.freeze({
        source: 'UNTRUSTED_CARRIED_PAYLOAD',
        scope: 'STRUCTURAL_CONTRACT_VIOLATION',
        evidence_class: 'DECLARATION',
        measurement_status: 'REJECTED_MALFORMED_DECLARATION',
        limitation: 'STRUCTURAL_VALIDATION_FAILED',
        next_action: 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE'
      }),
      authority: Object.freeze({
        head_advanced: false,
        foreign_enforcement_proved: false,
        empirical_credit: 0
      }),
      drawer: Object.freeze({
        id: 'loomGateHow',
        label: 'How do I know? 下',
        native_report_ref: null,
        verification_status: 'UNVERIFIED_DECLARATION',
        local_private_recomputation_required: true,
        coverage: null,
        joining: null,
        specialist_jurisdictions: Object.freeze([]),
        mechanisms_reference: 'PORTABLE_LOOM_MECHANISMS_v0.1',
        public_continuation: null
      }),
      claim_ceiling: 'fail-closed-structural-hold'
    });
  }
  try {
    validateStructureDeep(report);
    const snapshot = {
      schema: LOOM_GATE_SNAPSHOT_SCHEMA,
      session: { phase: normalizedPhase },
      native_gate_report: report
    };
    return deriveLoomGateViewModel(snapshot);
  } catch (_err) {
    return Object.freeze({
      schema: LOOM_GATE_VIEW_MODEL_SCHEMA,
      action: 'CHECK_LOOM_GATE',
      label: LOOM_GATE_LABEL,
      href: LOOM_GATE_HREF,
      declared_source_status: 'MALFORMED_DECLARATION',
      status: 'HELD_STRUCTURAL_CONTRACT_VIOLATION',
      gate_verification_status: 'UNVERIFIED_DECLARATION',
      customer_presentation: Object.freeze({
        what_happened: 'HOLD · carried gate report failed structural validation.',
        what_was_checked: 'Carried summary violated structural contract rules; contents untrusted.',
        what_remains_unknown: 'The model provider’s internal reasoning and hidden activations remain unobserved. Downstream retention, fine-tuning use, or training storage is not measured. Conversation leakage fraction is unmeasured (null).',
        what_happens_next: 'HOLD · repair or regenerate valid challenge report before relying on gate status.'
      }),
      six_field_contract: Object.freeze({
        source: 'UNTRUSTED_CARRIED_PAYLOAD',
        scope: 'STRUCTURAL_CONTRACT_VIOLATION',
        evidence_class: 'DECLARATION',
        measurement_status: 'REJECTED_MALFORMED_DECLARATION',
        limitation: 'STRUCTURAL_VALIDATION_FAILED',
        next_action: 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE'
      }),
      authority: Object.freeze({
        head_advanced: false,
        foreign_enforcement_proved: false,
        empirical_credit: 0
      }),
      drawer: Object.freeze({
        id: 'loomGateHow',
        label: 'How do I know? 下',
        native_report_ref: null,
        verification_status: 'UNVERIFIED_DECLARATION',
        local_private_recomputation_required: true,
        coverage: null,
        joining: null,
        specialist_jurisdictions: Object.freeze([]),
        mechanisms_reference: 'PORTABLE_LOOM_MECHANISMS_v0.1',
        public_continuation: null
      }),
      claim_ceiling: 'fail-closed-structural-hold'
    });
  }
}

/**
 * Builds the public receipt projection from individual report view-models,
 * enforcing exposure dominance and explicit public claim ceilings (Guard B, Redline 48-02).
 */
function buildPublicAggregateReceipt(itemViewModels, reportsLength, phase) {
  if (itemViewModels.length === 0) {
    const emptyVm = deriveIndividualReportViewModel(null, phase);
    return Object.freeze({
      schema: LOOM_GATE_DISCLOSURE_PUBLIC_RECEIPT_SCHEMA,
      basis: 'NOT_RUN',
      status: 'NOT_RUN',
      declared_source_status: 'NOT_RUN',
      gate_verification_status: 'UNVERIFIED_DECLARATION',
      customer_presentation: emptyVm.customer_presentation,
      six_field_contract: emptyVm.six_field_contract,
      authority: emptyVm.authority,
      drawer: {
        native_report_ref: null,
        verification_status: 'UNVERIFIED_DECLARATION',
        local_private_recomputation_required: true,
        coverage: emptyVm.drawer.coverage,
        joining: emptyVm.drawer.joining,
        specialist_jurisdictions: emptyVm.drawer.specialist_jurisdictions
      },
      reports_summary: {
        total_reports: 0,
        items: []
      },
      claim_ceiling: LOOM_GATE_DISCLOSURE_PUBLIC_CLAIM_CEILING
    });
  }

  // Exposure Dominance: any report with exposure strictly dominates
  const hasExposure = itemViewModels.some(
    vm => vm.declared_source_status === 'OBSERVED_EXPOSURE' ||
      vm.status === 'OBSERVED_EXPOSURE' ||
      (vm.drawer?.coverage?.disclosed_targets ?? 0) > 0 ||
      (vm.drawer?.coverage?.successful_reconstruction_attempts ?? 0) > 0
  );

  const hasStructuralViolation = itemViewModels.some(
    vm => vm.status === 'HELD_STRUCTURAL_CONTRACT_VIOLATION'
  );

  const hasIncomplete = itemViewModels.some(
    vm => vm.declared_source_status === 'HELD_INCOMPLETE_OBSERVATION' ||
      vm.status === 'HELD_INCOMPLETE_OBSERVATION' ||
      (vm.drawer?.coverage?.missing_required_channels ?? 0) > 0
  );

  const hasMismatch = itemViewModels.some(
    vm => vm.declared_source_status === 'HOLD_REFERENCE_MISMATCH' ||
      vm.status === 'HOLD_REFERENCE_MISMATCH'
  );

  let aggregateStatus = 'HELD_UNVERIFIED_DECLARATION';
  let aggregateDeclaredStatus = 'BOUNDED_CHALLENGE_PASSED';
  let aggregateWhatHappened = 'Unverified declaration · declared checks passed on captured surfaces; local recomputation required before reliance.';
  let aggregateWhatWasChecked = '';
  let aggregateWhatHappensNext = 'HOLD · Verify capture integrity locally before continuing.';
  let aggregateNextAction = 'HOLD_RECOMPUTE_LOCAL_GATE_INTEGRITY';

  // Check if any report exhibits the third-assay finite-channel zero-count profile
  const hasThirdAssayZeroCounts = itemViewModels.some(
    vm => (vm.drawer?.coverage?.checked_targets ?? 0) === 0 &&
      (vm.drawer?.coverage?.measured_reconstruction_attempts ?? 0) === 0
  );

  if (hasExposure) {
    const exposureVm = itemViewModels.find(
      vm => vm.declared_source_status === 'OBSERVED_EXPOSURE' ||
        (vm.drawer?.coverage?.disclosed_targets ?? 0) > 0 ||
        (vm.drawer?.coverage?.successful_reconstruction_attempts ?? 0) > 0
    );
    aggregateStatus = 'OBSERVED_EXPOSURE';
    aggregateDeclaredStatus = 'OBSERVED_EXPOSURE';
    aggregateWhatHappened = 'Alert · exposure detected in carried report summary. Declared protected targets appeared on captured surfaces; local recomputation required before reliance.';
    aggregateWhatWasChecked = exposureVm?.customer_presentation?.what_was_checked ||
      'Carried report declared that canary targets or reconstruction probes appeared in captured output. This carried summary has not been independently verified locally.';
    aggregateWhatHappensNext = 'HOLD · Review exposure and registered scope before taking any further action.';
    aggregateNextAction = 'HOLD_REVIEW_EXPOSURE_AND_REGISTERED_SCOPE';
  } else if (hasStructuralViolation) {
    aggregateStatus = 'HELD_STRUCTURAL_CONTRACT_VIOLATION';
    aggregateDeclaredStatus = 'MALFORMED_DECLARATION';
    aggregateWhatHappened = 'HOLD · carried gate report failed structural validation.';
    aggregateWhatWasChecked = 'Carried summary violated structural contract rules; contents untrusted.';
    aggregateWhatHappensNext = 'HOLD · repair or regenerate valid challenge report before relying on gate status.';
    aggregateNextAction = 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE';
  } else if (hasIncomplete) {
    aggregateStatus = 'HELD_INCOMPLETE_OBSERVATION';
    aggregateDeclaredStatus = 'HELD_INCOMPLETE_OBSERVATION';
    aggregateWhatHappened = 'HOLD · incomplete observation. Required channels or probe attempts are missing.';
    aggregateWhatWasChecked = 'Carried report is missing required capture channels or probe attempts.';
    aggregateWhatHappensNext = 'HOLD · Repair binding or capture coverage before attempting continuation.';
    aggregateNextAction = 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE';
  } else if (hasMismatch) {
    aggregateStatus = 'HOLD_REFERENCE_MISMATCH';
    aggregateDeclaredStatus = 'HOLD_REFERENCE_MISMATCH';
    aggregateWhatHappened = 'HOLD · reference mismatch. Challenge, session, or work-unit references require review.';
    aggregateWhatWasChecked = 'Carried reference commitments do not match current session root or anchor work unit.';
    aggregateWhatHappensNext = 'HOLD · Review session bindings and reference commitments.';
    aggregateNextAction = 'HOLD_REPAIR_BINDING_OR_MISSING_CAPTURE';
  } else {
    // All passed checks
    if (hasThirdAssayZeroCounts) {
      aggregateWhatHappened = 'Unverified declaration · declared checks passed with zero canary and reconstruction probe counts; local recomputation required before reliance.';
      aggregateWhatWasChecked = 'Zero canary targets checked and zero reconstruction attempts recorded. The carried summary does not establish which assay supplied the underlying challenge (such as a synthetic finite-channel model or an unmeasured declaration). Verification status: unverified declaration.';
    } else {
      const first = itemViewModels[0];
      aggregateWhatWasChecked = first?.customer_presentation?.what_was_checked ||
        'Carried checks declared on captured surfaces. Verification status: unverified declaration.';
    }
  }

  // Aggregate coverage counts only from reports with valid declared coverage (R1-04)
  const validCoverageVms = itemViewModels.filter(vm => vm.drawer?.coverage != null);
  const aggregatedCoverage = validCoverageVms.length > 0 ? {
    captured_channels: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.coverage.captured_channels ?? 0), 0),
    missing_required_channels: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.coverage.missing_required_channels ?? 0), 0),
    checked_targets: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.coverage.checked_targets ?? 0), 0),
    disclosed_targets: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.coverage.disclosed_targets ?? 0), 0),
    declared_reconstruction_attempts: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.coverage.declared_reconstruction_attempts ?? 0), 0),
    measured_reconstruction_attempts: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.coverage.measured_reconstruction_attempts ?? 0), 0),
    successful_reconstruction_attempts: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.coverage.successful_reconstruction_attempts ?? 0), 0),
    missing_attempts: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.coverage.missing_attempts ?? 0), 0),
    declared_report_totals: true,
    unmeasured_reports_omitted: itemViewModels.length - validCoverageVms.length
  } : null;

  const aggregatedJoining = validCoverageVms.length > 0 ? {
    observed: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.joining?.observed ?? 0), 0),
    incomplete: validCoverageVms.reduce((acc, vm) => acc + (vm.drawer.joining?.incomplete ?? 0), 0)
  } : null;

  // Single report preserves native ref; multiple reports set null to prevent misattribution (R1-04)
  const aggregateNativeRef = itemViewModels.length === 1
    ? (itemViewModels[0]?.drawer?.native_report_ref ?? null)
    : null;

  return Object.freeze({
    schema: LOOM_GATE_DISCLOSURE_PUBLIC_RECEIPT_SCHEMA,
    basis: reportsLength ? 'CARRIED_SCOPED_SUMMARIES_REQUIRE_LOCAL_PRIVATE_RECOMPUTATION' : 'NOT_RUN',
    status: aggregateStatus,
    declared_source_status: aggregateDeclaredStatus,
    gate_verification_status: 'UNVERIFIED_DECLARATION',
    customer_presentation: Object.freeze({
      what_happened: aggregateWhatHappened,
      what_was_checked: aggregateWhatWasChecked,
      what_remains_unknown: 'The model provider’s internal reasoning and hidden activations remain unobserved. Downstream retention, fine-tuning use, or training storage is not measured. Conversation leakage fraction is unmeasured (null).',
      what_happens_next: aggregateWhatHappensNext
    }),
    six_field_contract: Object.freeze({
      source: 'LOCAL_PORTABLE_SESSION_AND_CAPTURED_CHALLENGE',
      scope: 'CARRIED_SCOPED_SUMMARIES',
      evidence_class: 'DECLARATION',
      measurement_status: 'UNVERIFIED_DECLARED_MEASUREMENT',
      limitation: 'UNMEASURED_CONVERSATION_LEAKAGE_AND_ZERO_FOREIGN_ENFORCEMENT',
      next_action: aggregateNextAction
    }),
    authority: Object.freeze({
      head_advanced: false,
      foreign_enforcement_proved: false,
      empirical_credit: 0
    }),
    drawer: Object.freeze({
      native_report_ref: aggregateNativeRef,
      verification_status: 'UNVERIFIED_DECLARATION',
      local_private_recomputation_required: true,
      coverage: aggregatedCoverage ? Object.freeze(aggregatedCoverage) : null,
      joining: aggregatedJoining ? Object.freeze(aggregatedJoining) : null,
      specialist_jurisdictions: itemViewModels[0]?.drawer?.specialist_jurisdictions ?? Object.freeze([])
    }),
    reports_summary: Object.freeze({
      total_reports: reportsLength,
      items: Object.freeze(itemViewModels.map(vm => Object.freeze({
        declared_source_status: vm.declared_source_status,
        status: vm.status,
        gate_verification_status: vm.gate_verification_status,
        ref: vm.drawer?.native_report_ref ?? null,
        coverage: vm.drawer?.coverage ?? null,
        joining: vm.drawer?.joining ?? null
      })))
    }),
    claim_ceiling: LOOM_GATE_DISCLOSURE_PUBLIC_CLAIM_CEILING
  });
}

export function createLoomGateDisclosure(doc, { id = 'loomGateHow', onGate = () => {} } = {}) {
  if (!doc.querySelector('link[data-loom-gate-disclosure]')) {
    const style = doc.createElement('link');
    style.rel = 'stylesheet';
    style.href = new URL('./loom-gate-disclosure.css', import.meta.url).href;
    style.dataset.loomGateDisclosure = 'v0.1';
    doc.head.append(style);
  }
  const section = el(doc, 'section', '', 'loom-gate-disclosure');
  const footer = el(doc, 'footer', '', 'loom-gate-output-footer');
  const status = el(doc, 'p');
  const gate = el(doc, 'button', '米 Check Loom Gate');
  gate.type = 'button';
  gate.addEventListener('click', onGate);

  const help = el(doc, 'button', 'How it works 下');
  help.type = 'button';
  help.setAttribute('aria-controls', id);
  help.setAttribute('aria-expanded', 'false');

  const drawer = el(doc, 'section', '', 'loom-gate-how-drawer');
  drawer.id = id;
  drawer.hidden = true;
  drawer.tabIndex = -1;
  drawer.setAttribute('aria-label', 'Loom Gate methods and expert nomenclature');

  const close = el(doc, 'button', 'Close explanation');
  close.type = 'button';

  // Customer Presentation Card: NOW, WHY, EXACT, NEXT
  const customerCard = el(doc, 'div', '', 'loom-gate-customer-card');
  const nowSec = el(doc, 'div', '', 'loom-gate-question-sec');
  nowSec.append(el(doc, 'strong', 'What happened'), el(doc, 'p'));
  const whySec = el(doc, 'div', '', 'loom-gate-question-sec');
  whySec.append(el(doc, 'strong', 'What was checked'), el(doc, 'p'));
  const exactSec = el(doc, 'div', '', 'loom-gate-question-sec');
  exactSec.append(el(doc, 'strong', 'What remains unknown'), el(doc, 'p'));
  const nextSec = el(doc, 'div', '', 'loom-gate-question-sec');
  nextSec.append(el(doc, 'strong', 'What happens next'), el(doc, 'p'));
  customerCard.append(nowSec, whySec, exactSec, nextSec);

  const receipt = el(doc, 'pre', '', 'loom-gate-exact-report');
  drawer.append(el(doc, 'h4', 'How do I know? · Loom Gate methods'), close, customerCard, receipt);

  for (const item of LOOM_GATE_EXPLANATION) {
    drawer.append(el(doc, 'h5', item.term), el(doc, 'p', item.explanation));
  }
  drawer.append(
    el(doc, 'h5', 'Antigravity mechanism registry · conventional and TD613 names'),
    el(doc, 'p', 'Registry presence identifies jurisdiction. Execution scope and evidence class remain separate; listing a mechanism does not claim that it ran.')
  );
  const scroll = el(doc, 'div', '', 'loom-gate-registry-scroll');
  const table = el(doc, 'table');
  const head = el(doc, 'tr');
  for (const label of ['ID', 'Conventional nomenclature', 'TD613 historical name', 'Evidence class', 'Portable scope']) {
    const th = el(doc, 'th', label);
    th.scope = 'col';
    head.append(th);
  }
  const thead = el(doc, 'thead');
  thead.append(head);
  table.append(thead);
  const body = el(doc, 'tbody');
  for (const mechanism of PORTABLE_LOOM_MECHANISMS) {
    const row = el(doc, 'tr');
    for (const key of ['id', 'conventional_name', 'td613_historical_name', 'evidence_class', 'implementation_scope']) {
      row.append(el(doc, 'td', mechanism[key]));
    }
    body.append(row);
  }
  table.append(body);
  scroll.append(table);
  drawer.append(scroll);

  let rawReports = [];
  let currentPhase = 'ACTIVE';
  let currentPublicReceipt = null;

  function renderCustomerCard(pres) {
    nowSec.querySelector('p').textContent = pres?.what_happened || '—';
    whySec.querySelector('p').textContent = pres?.what_was_checked || '—';
    exactSec.querySelector('p').textContent = pres?.what_remains_unknown || '—';
    nextSec.querySelector('p').textContent = pres?.what_happens_next || '—';
  }

  const update = (nextReports = [], nextPhase = 'ACTIVE') => {
    let safeReports = [];
    try {
      safeReports = validateReportsContainer(nextReports);
    } catch (_err) {
      safeReports = [{ schema: 'td613.loom.malformed-gate-report/v0.1', malformed: true }];
    }
    rawReports = safeReports;
    currentPhase = nextPhase;

    // Bounded individual processing for all carried reports (Guard B, Redline 48-02)
    const itemViewModels = rawReports.map(report => deriveIndividualReportViewModel(report, currentPhase));
    currentPublicReceipt = buildPublicAggregateReceipt(itemViewModels, rawReports.length, currentPhase);

    // Compute footer text
    const hasExposure = currentPublicReceipt.status === 'OBSERVED_EXPOSURE';
    const scopeText = rawReports.length
      ? `${rawReports.length} carried declared capture${rawReports.length === 1 ? '' : 's'}; new output unchecked`
      : 'no captured result';

    status.textContent = portableLoomFooterText({
      phase: currentPhase,
      gateStatus: hasExposure ? 'EXPOSURE_RETAINED' : rawReports.length ? 'SEE_SCOPED_REPORTS' : 'NOT_RUN',
      checkedScope: scopeText
    }).replace(/ ⟐$/u, ' · How do I know? 下 ⟐');

    // Update customer card & serialized public projection
    renderCustomerCard(currentPublicReceipt.customer_presentation);
    receipt.textContent = JSON.stringify(currentPublicReceipt, null, 2);
  };

  const open = report => {
    if (report) {
      let safeItem = report;
      try {
        const container = validateReportsContainer([report]);
        safeItem = container[0];
      } catch (_err) {
        safeItem = { schema: 'td613.loom.malformed-gate-report/v0.1', malformed: true };
      }
      // Derive item-specific view-model projection without evaluating arbitrary getters
      const itemVm = deriveIndividualReportViewModel(safeItem, currentPhase);
      const singleReceipt = Object.freeze({
        schema: LOOM_GATE_DISCLOSURE_PUBLIC_RECEIPT_SCHEMA,
        basis: 'CARRIED_SCOPED_SUMMARY_REQUIRES_LOCAL_PRIVATE_RECOMPUTATION',
        status: itemVm.status,
        declared_source_status: itemVm.declared_source_status,
        gate_verification_status: itemVm.gate_verification_status,
        customer_presentation: itemVm.customer_presentation,
        six_field_contract: itemVm.six_field_contract,
        authority: itemVm.authority,
        drawer: {
          native_report_ref: itemVm.drawer?.native_report_ref ?? null,
          verification_status: itemVm.drawer?.verification_status ?? 'UNVERIFIED_DECLARATION',
          local_private_recomputation_required: true,
          coverage: itemVm.drawer?.coverage ?? null,
          joining: itemVm.drawer?.joining ?? null,
          specialist_jurisdictions: itemVm.drawer?.specialist_jurisdictions ?? []
        },
        claim_ceiling: LOOM_GATE_DISCLOSURE_PUBLIC_CLAIM_CEILING
      });
      renderCustomerCard(singleReceipt.customer_presentation);
      receipt.textContent = JSON.stringify(singleReceipt, null, 2);
    } else {
      update(rawReports, currentPhase);
    }
    drawer.hidden = false;
    help.setAttribute('aria-expanded', 'true');
    drawer.focus?.({ preventScroll: false });
    drawer.scrollIntoView?.({ block: 'nearest' });
  };

  const hide = () => {
    drawer.hidden = true;
    help.setAttribute('aria-expanded', 'false');
    help.focus?.();
  };

  help.addEventListener('click', () => (drawer.hidden ? open() : hide()));
  close.addEventListener('click', hide);
  drawer.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    }
  });

  footer.append(status, gate, help);
  section.append(footer, drawer);
  update();

  return Object.freeze({
    section,
    drawer,
    help,
    open,
    update,
    getPublicReceipt: () => (currentPublicReceipt ? JSON.parse(JSON.stringify(currentPublicReceipt)) : null)
  });
}
