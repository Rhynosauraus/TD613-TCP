---
name: dollhouse-design
description: >-
  Generates consequential artistic, motion, scholarly, and theoretical compositions from intellectual seeds using instrument-led authorship, selectable formal grammars (Phasonic Counterpoint, Caro Institutional Reconstruction, Butlerian Performativity, Sedgwickian Reparative Texture), and refractive counterfactual mutation. Use for creative synthesis, visual installations, transmedia adaptation, and essays.
---

# 𝌋 TD613 Dollhouse Design Skill (DD-02)

The **TD613 Dollhouse Design** skill is a repository-native generative authoring instrument operating under `OPEN_FIELD_CREATIVE_SYNTHESIS`. It discovers and constructs consequential forms across visual, motion, scholarly, theoretical, and hybrid media.

Rather than imposing a standard template (cards, introduction/methods/conclusion, predictable grids), Dollhouse Design insists that:
> **Form must emerge from the consequential relations of the work being made.**

---

## Native Antigravity Activation & Invocation

In the Antigravity pairing environment, `/dollhouse-design` is invoked natively through:
1. **Direct User Prompt / Slash Command:** The operator specifies `/dollhouse-design` or requests a creative/scholarly composition from an intellectual seed.
2. **Skill Discovery:** Antigravity matches the request against this skill declaration (`.agents/skills/dollhouse-design/SKILL.md`).
3. **Instruction Loading:** The agent loads `SKILL.md` and relevant references (`authoring-cycle.md`, `selectable-instruments.md`).
4. **Conductor Dispatch:** The agent executes the deterministic conductor via programmatic API (`runDollhouseDesignCycle`) or CLI runner (`scripts/run-dollhouse-design.mjs`).
5. **Receipt Ingress:** The conductor emits a frozen, validated return receipt (`td613.dollhouse-design.return-receipt/v0.2`).
6. **Creative Materialization:** The generative author consumes the receipt directives and materializes both Candidate A (primary) and Candidate B / Refraction (counterfactual).

---

## The 8-Stage Authoring Cycle

```text
COMMISSION 
  ⟶ SELECT INSTRUMENTS 
  ⟶ GENERATE ALTERNATIVES 
  ⟶ COMPOSE 
  ⟶ MATERIALIZE 
  ⟶ REFRACT 
  ⟶ COMPARE 
  ⟶ RETURN
```

1. **Commission:** Enter via a typed semantic seed, Human Coordinate Coupling ($\mathcal{H}_q = (\text{WHAT}, \text{WHO}, \text{WHERE}, \text{HOW}, \text{WHEN}, \text{WHY})$), and optional historical references.
2. **Select Instruments:** Choose from the library of available formal traditions (D₃/φ Counterpoint is selectable, never compulsory). If omitted, inferred contextually via `THEMATIC_CLUSTERS`.
3. **Generate Alternatives:** Propagate the problem into at least two structurally non-equivalent formal candidates before committing to layout.
4. **Compose:** Apply the five generative verbs (Propagation, Compression, Coupling, Transition, Stabilization).
5. **Materialize:** Generate real, executable artifacts (HTML, CSS, manuscripts, mathematical models) rather than descriptive outlines.
6. **Refract:** Mutate exactly one governing formal decision to construct a competing counterfactual variant.
7. **Compare:** Evaluate what was gained, what survived, and what was lost between the primary realization and its refraction.
8. **Return:** Deliver the inspectable artifact, its refractive counterpart, and concise creative rationales to the human operator for final selection and closure.

---

## Historical Reference Ingestion (Pre-M6 Standard)

To support rich historical design briefs (such as the Holonomy Loom pre-M6 audition) without reducing complex records to shallow keywords, commissions support structured `historical_references`:

```json
{
  "reference_id": "REF-LOOM-CUSTODY-01",
  "source_path": "docs/reentry/RELATION_MAP.md",
  "source_revision": "e0a7ba5f3b76f545da11037833c269abd7623a04",
  "classification": "BINDING_CUSTODY_LAW",
  "provenance_class": "CONTEMPORANEOUS_ORIGINAL",
  "summary": "Registration, Check, Challenge, and Carrier continuation custody law."
}
```

- **Four Epistemic Tiers (`classification`):**
  - `BINDING_CUSTODY_LAW` / `BINDING_CONSTRAINT`: Invariants that the creative author must rigorously uphold. Fails closed (`ReferenceError`) if the file cannot be retrieved at the declared revision.
  - `NEGOTIABLE_AESTHETIC_DIRECTION`: Historical visual cues or UX patterns that the author is free to reinterpret.
  - `CONDUCTOR_HEURISTICS`: Deterministic scoring rules, candidate suggestions, and syntactic triggers.
  - `AGENT_AUTHORED_DECISIONS`: Final concrete HTML, CSS, and layout selections created by the generative author.
- **Three Provenance Classes (`provenance_class`):**
  - `CONTEMPORANEOUS_ORIGINAL`: Contemporaneously captured source records bound to immutable commit revisions.
  - `RECONSTRUCTED_RECORD`: Historical artifacts or structures reconstructed from subsequent analysis.
  - `ANNOTATED_RECORD`: Historical records supplemented with interpretive or procedural metadata.
- **Fail-Closed Resolution & Substantive Ingestion:** The conductor verifies and retrieves reference bytes via `git show <revision>:<path>` (or local filesystem), recording byte counts, SHA-256 digests, and substantive content excerpts in the return receipt so the authoring context reads actual source text rather than shallow summaries alone.

---

## Selectable Creative Instruments

A single geometric framework must never be imposed across all inquiries. The authoring system selects from five canonical instruments based on the commission's needs:

| Instrument ID | Lineage / Foundation | Primary Generative Capability | Recommended Media |
|---|---|---|---|
| **`PHASONIC_COUNTERPOINT`** | Aperture v3.2-alpha Triple Overlay | Periodic scaffold ($T_\Delta$) + quasiperiodic counterlayer ($Q_\varphi$) + interference field ($H$); transmedia invariance | Visual, Motion, Hybrid, Theoretical |
| **`CARO_INSTITUTIONAL_RECONSTRUCTION`** | Robert Caro (Thinkers Bin 2) | Procedural clearance latency ($T_{\text{clearance}} = \mu \times 400\text{ms}$), discrete petition redaction ($4 \times \text{chamber}$), and archival resistance | Scholarly, Visual, Product, Hybrid |
| **`BUTLER_PERFORMATIVE_ITERATION`** | Judith Butler (Thinkers Bin 2) | Citational reiteration, ritualized normative convention, and subversive slippage across repetitions | Scholarly, Theoretical, Visual |
| **`SEDGWICK_REPARATIVE_TEXTURE`** | Eve Kosofsky Sedgwick (Thinkers Bin 2) | Textural parataxis (beside-ness), affective survival, and resisting paranoid hermeneutic closure | Scholarly, Visual, Product |
| **`DIALECTICAL_TENSION`** | Polyphonic Contrapuntalism | Irreducible antithesis, competing perspectives, and non-synthesized juxtaposition | Scholarly, Theoretical, Motion |

---

## The Five Generative Verbs

- **PROPAGATION:** Let the problem produce its own structural alternatives with different governing premises.
- **COMPRESSION:** Find the minimum form that preserves the essential relation set ($R(s) \subseteq R(c)$) without conceptual impoverishment.
- **COUPLING:** Make distinct disciplines or media change each other structurally (e.g. typography changes motion; motion alters argument).
- **TRANSITION:** Shift the projection into another medium ($\Pi_{m, w}(s)$) while holding the intellectual seed invariant.
- **STABILIZATION:** Allow the competing tensions to settle into a definite, inspectable artifact whose remaining openness has a declared reason.

---

## CLI Execution & Programmatic Dispatch

### 1. Deterministic CLI Runner
Backed by `scripts/run-dollhouse-design.mjs`:

```bash
# Author via CLI flags
node scripts/run-dollhouse-design.mjs -s "Two processes arrive at an identical endpoint, but their histories differ" -m VISUAL -i PHASONIC_COUNTERPOINT

# Author via JSON commission file
node scripts/run-dollhouse-design.mjs --input commission.json --output receipt.json --format both

# Author via Standard Input Stream (Piped)
cat commission.json | node scripts/run-dollhouse-design.mjs --stdin --format json
```

### 2. Programmatic Dispatcher API
In ESM JavaScript:

```javascript
import { runDollhouseDesignCycle } from './app/engine/dollhouse-design-conductor.js';

const result = await runDollhouseDesignCycle({
  seed: 'An instrument that measures the weight of what is deleted',
  medium: 'SCHOLARLY',
  instruments: ['CARO_INSTITUTIONAL_RECONSTRUCTION', 'SEDGWICK_REPARATIVE_TEXTURE'],
  human_coordinates: {
    what: 'Scholarly critique of administrative redaction',
    who: 'The archivist vs. the erased subject',
    where: 'The historical inscription ledger',
    how: 'Measuring the displaced volume of omitted text',
    when: 'At the moment of deletion vs. the moment of recovery',
    why: 'To determine whether deletion destroys or preserves'
  },
  historical_references: [
    {
      reference_id: "REF-01",
      source_path: "docs/reentry/RELATION_MAP.md",
      source_revision: "e0a7ba5f3b76f545da11037833c269abd7623a04",
      classification: "BINDING_CUSTODY_LAW",
      provenance_class: "CONTEMPORANEOUS_ORIGINAL",
      summary: "Custody boundary map."
    }
  ],
  scientific_audit_requested: false
});

console.log(result.primary_materialization);
console.log(result.refractive_variant);
```

---

## Scientific Firebreak & Authority Law

1. **Firebreak of Authority:**  
   The Design Conductor operates under `OPEN_FIELD_CREATIVE_SYNTHESIS`. It **never** possesses scientific admission, merge, release, deployment, or production mutation authority (`scientific_proof: false`, `release_authority: false`).
2. **Advisory Companion:**  
   The design engine may call `/dollhouse-audit` to perform an advisory check on mathematical consistency or timeline non-retroactivity, but creative synthesis never generates empirical replication credit (`EMPIRICAL_CREDIT_0`).
3. **The Unborn Specialist:**  
   `Palate` remains unborn. Aesthetic judgment is exercised through comparative refraction, not an autonomous algorithmic quality-score.
4. **Preserved Thinkers Bin:**  
   The canonical 28-member Thinkers Bin remains intact. Thinkers inform generative questions without becoming decorative labels.

---

## Detailed References

- [Authoring Cycle Specification](./references/authoring-cycle.md)
- [Selectable Creative Instruments](./references/selectable-instruments.md)
- [Scientific Firebreak & Provenance](./references/firebreak-and-provenance.md)
