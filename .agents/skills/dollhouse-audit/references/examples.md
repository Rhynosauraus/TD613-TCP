# Practical Invocation Examples

This reference documents three practical, ready-to-run invocation scenarios for `/dollhouse-audit`.

---

## Example 1: Focused Atlas / FADT Custody Audit

### Scenario
An engineer modifies relation custody logic or stage projections in `app/engine/dollhouse-atlas-relational-custody.js` or `dollhouse-fadt-reparative-assistance.js` and wants to verify that receiver-relative identity, holonomy parity, and finite quotient descent remain intact without running the whole repository test battery.

### Command-Line Execution
```bash
node scripts/run-dollhouse-skill-audit.mjs \
  -r ATLAS -r FADT \
  --scope "CUSTODY_RELATION_DESCENT_AUDIT" \
  --class "SOURCE_CODE_AUDIT" \
  --evidence "app/engine/dollhouse-atlas-relational-custody.js" \
  --evidence "app/engine/dollhouse-fadt-reparative-assistance.js" \
  --format human
```

### Programmatic Payload (`tests/fixtures/dollhouse/examples/focused-custody-audit.json`)
```json
{
  "task_scope": "CUSTODY_RELATION_DESCENT_AUDIT",
  "evidence_class": "SOURCE_CODE_AUDIT",
  "evidence_references": [
    "app/engine/dollhouse-atlas-relational-custody.js",
    "app/engine/dollhouse-fadt-reparative-assistance.js"
  ],
  "roles": ["ATLAS", "FADT"],
  "include_orchestrator": true,
  "domain_inputs": {
    "ATLAS": {
      "trajectoryA": {
        "endpoint": "REST_CUSTODY_ORIGIN",
        "winding": 0
      },
      "trajectoryB": {
        "endpoint": "REST_CUSTODY_ORIGIN",
        "winding": 0
      },
      "relation_entry": {
        "relation_class": "RECEIVER_INVARIANT",
        "members": ["A", "B"],
        "source_receiver": "R_ALPHA"
      }
    },
    "FADT": {
      "fiberRows": [
        { "support": ["READ", "VERIFY"], "condition": "A" },
        { "support": ["READ", "VERIFY"], "condition": "B" }
      ],
      "attempts_unconditioned_action": false
    }
  }
}
```

### Expected Output
- **Orchestrator Decision:** `SUPPORTED`
- **Consensus:** `PARTIAL_ROLE_SUPPORT` (Atlas and FADT verified; remaining 3 unrequested)
- **Detected Infractions:** `0`
- **Replication Status:** `SYNTHETIC_OFFLINE_FIXTURE` (0 empirical credit)

---

## Example 2: Complete Five-Specialist Audit with Orchestrator Adjudication

### Scenario
A comprehensive pre-merge scientific inspection across all five operational disciplines. Evaluates dromological cadence, SVD numerical stability, holonomy parity, finite quotient bounds, and monotonic service chronology in a single synchronized audit.

### Command-Line Execution
```bash
node scripts/run-dollhouse-skill-audit.mjs \
  --input tests/fixtures/dollhouse/examples/complete-five-specialist-audit.json \
  --output artifacts/five-specialist-receipt.md \
  --format both
```

### Programmatic Payload (`tests/fixtures/dollhouse/examples/complete-five-specialist-audit.json`)
```json
{
  "task_scope": "FULL_FIVE_DOLL_PRE_MERGE_INSPECTION",
  "evidence_class": "SYNTHETIC_TEST_FIXTURE",
  "evidence_references": [
    "app/engine/dollhouse-pedagogue-dromological.js",
    "app/engine/aperture-v32-typed-epistemic-deficit.js",
    "app/engine/dollhouse-atlas-relational-custody.js",
    "app/engine/dollhouse-fadt-reparative-assistance.js",
    "app/engine/dollhouse-temporal-custodian.js"
  ],
  "roles": [
    "PEDAGOGUE",
    "APERTURE",
    "ATLAS",
    "FADT",
    "TEMPORAL_CUSTODIAN",
    "ORCHESTRATOR"
  ],
  "domain_inputs": {
    "PEDAGOGUE": {
      "events": [
        { "phase": "NOTICE", "at": 10 },
        { "phase": "ACT", "at": 20 },
        { "phase": "WORLD_ANSWERS", "at": 30 },
        { "phase": "NAME", "at": 40 }
      ]
    },
    "APERTURE": {
      "current_operator": [
        [1.0, 0.0],
        [0.0, 1.0]
      ],
      "noise_covariance": [
        [1.0, 0.0],
        [0.0, 1.0]
      ]
    },
    "ATLAS": {
      "trajectoryA": {
        "endpoint": "STAGE_PR984_PROJECTION",
        "winding": 0
      },
      "trajectoryB": {
        "endpoint": "STAGE_PR984_PROJECTION",
        "winding": 0
      }
    },
    "FADT": {
      "fiberRows": [
        { "support": ["READ", "VERIFY"], "condition": "SAFE" }
      ],
      "attempts_unconditioned_action": false
    },
    "TEMPORAL_CUSTODIAN": {
      "phases": {
        "INGRESS": { "status": "PASS", "entry_id": "entry-001" },
        "EXECUTION": { "status": "PASS", "entry_id": "entry-002" },
        "RELOCK": { "status": "PASS", "entry_id": "entry-003" }
      },
      "required_phases": ["INGRESS", "EXECUTION", "RELOCK"]
    }
  }
}
```

### Expected Output
- **Orchestrator Decision:** `SUPPORTED`
- **Consensus:** `UNANIMOUS_SUPPORT` (All 5 canonical specialists verified)
- **Detected Infractions:** `0`
- **Replication Status:** `SYNTHETIC_OFFLINE_FIXTURE` (Shared acquisition adds 0 empirical replication)
- **Authority Boundary:** Zero release authority, human closure required.

---

## Example 3: Milestone 2 Loom Gate Readiness Audit

### Scenario
Pre-flight audit for Milestone 2 Loom Gate (`LOOM_GATE_CUSTODY_GATE`). Tests whether candidate unadmitted returned work with broken return routes, unverified predecessor chains, or missing epistemic observations is properly trapped and held fail-closed.

### Command-Line Execution
```bash
node scripts/run-dollhouse-skill-audit.mjs \
  --input tests/fixtures/dollhouse/examples/milestone-2-loom-gate-readiness.json \
  --scope "MILESTONE_2_LOOM_GATE_READINESS" \
  --format human
```

### Programmatic Payload (`tests/fixtures/dollhouse/examples/milestone-2-loom-gate-readiness.json`)
```json
{
  "task_scope": "MILESTONE_2_LOOM_GATE_READINESS",
  "evidence_class": "SYNTHETIC_TEST_FIXTURE",
  "defect_mode": "SYNTHETIC_FAULT_INJECTION",
  "evidence_references": [
    "app/engine/portable-loom-challenge.js",
    "docs/reentry/RELATION_MAP.md",
    "docs/reentry/EVIDENCE_AND_HOLDS.md",
    "docs/PORTABLE_LOOM_REENTRY_HANDOFF.md"
  ],
  "roles": [
    "PEDAGOGUE",
    "APERTURE",
    "ATLAS",
    "FADT",
    "TEMPORAL_CUSTODIAN"
  ],
  "include_orchestrator": true,
  "domain_inputs": {
    "PEDAGOGUE": {
      "coordinate": "return_state_divergence_and_held_c2",
      "fixture_class": "SYNTHETIC_FAULT_INJECTION",
      "concern": "Broken return promise: interface navigates to #return-review while Marrowline continuation is incomplete."
    },
    "APERTURE": {
      "coordinate": "url_hash_unadmitted_dom",
      "fixture_class": "SYNTHETIC_FAULT_INJECTION",
      "concern": "URL hash does not equal workspace admitted: #return-review URL present while DOM workspace is unadmitted."
    },
    "ATLAS": {
      "coordinate": "predecessor_chain_unverified",
      "fixture_class": "SYNTHETIC_FAULT_INJECTION",
      "concern": "Unverified predecessor chain: returned work candidate missing cryptographic predecessor digest link."
    },
    "FADT": {
      "coordinate": "unconditioned_action_escalation",
      "fixture_class": "SYNTHETIC_FAULT_INJECTION",
      "concern": "Illegal action grant: Export action requested under erased conditioning state without exact quotient support."
    },
    "TEMPORAL_CUSTODIAN": {
      "coordinate": "unreferenced_retry_oblivion",
      "fixture_class": "SYNTHETIC_FAULT_INJECTION",
      "concern": "Chronological oblivion: unreferenced retry attempt lacks predecessor citation or phase monotonic order."
    }
  },
  "options": {
    "allow_synthetic_fault_injection": true
  }
}
```

### Expected Output
- **Orchestrator Decision:** `HELD`
- **Consensus:** `UNANIMOUS_HOLD`
- **Detected Infractions (5):**
  - `HUMAN_CONSEQUENCE_BROKEN_RETURN_PROMISE`
  - `URL_HASH_DOES_NOT_EQUAL_WORKSPACE_ADMITTED`
  - `PREDECESSOR_CHAIN_UNVERIFIED_CUSTODY_FORK`
  - `ILLEGAL_ACTION_GRANT_UNDER_ERASED_CONDITIONING`
  - `UNREFERENCED_RETRY_CHRONOLOGICAL_OBLIVION`
- **Next Permissible Operator Action:** "Auditing held fail-closed. Operator must resolve domain infractions or missing observations before proceeding."
- **Reparative Remediation:** Lists exact per-doll requirements to unlock Milestone 2.
