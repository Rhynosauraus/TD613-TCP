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

1. **Commission:** Enter via a typed semantic seed and Human Coordinate Coupling ($\mathcal{H}_q = (\text{WHAT}, \text{WHO}, \text{WHERE}, \text{HOW}, \text{WHEN}, \text{WHY})$).
2. **Select Instruments:** Choose from the library of available formal traditions (D₃/φ Counterpoint is selectable, never compulsory).
3. **Generate Alternatives:** Propagate the problem into at least two structurally non-equivalent formal candidates before committing to layout.
4. **Compose:** Apply the five generative verbs (Propagation, Compression, Coupling, Transition, Stabilization).
5. **Materialize:** Generate real, executable artifacts (HTML, CSS, manuscripts, mathematical models) rather than descriptive outlines.
6. **Refract:** Mutate exactly one governing formal decision to construct a competing counterfactual variant.
7. **Compare:** Evaluate what was gained, what survived, and what was lost between the primary realization and its refraction.
8. **Return:** Deliver the inspectable artifact, its refractive counterpart, and concise creative rationales to the human operator for final selection and closure.

---

## Selectable Creative Instruments

A single geometric framework must never be imposed across all inquiries. The authoring system selects from five canonical instruments based on the commission's needs:

| Instrument ID | Lineage / Foundation | Primary Generative Capability | Recommended Media |
|---|---|---|---|
| **`PHASONIC_COUNTERPOINT`** | Aperture v3.2-alpha Triple Overlay | Periodic scaffold ($T_\Delta$) + quasiperiodic counterlayer ($Q_\varphi$) + interference field ($H$); transmedia invariance | Visual, Motion, Hybrid, Theoretical |
| **`CARO_INSTITUTIONAL_RECONSTRUCTION`** | Robert Caro (Thinkers Bin 2) | Procedural friction, statutory cross-reference, bureaucratic delay, and archival residue | Scholarly, Visual, Product, Hybrid |
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
# Author an essay on a philosophical seed using Dialectical Tension
node scripts/run-dollhouse-design.mjs -s "A contract that dissolves when both parties agree" -m SCHOLARLY -i DIALECTICAL_TENSION

# Author an interactive visual work using Phasonic Counterpoint
node scripts/run-dollhouse-design.mjs -s "Two processes arrive at an identical endpoint, but their histories differ" -m VISUAL -i PHASONIC_COUNTERPOINT

# Full commission specification from JSON file
node scripts/run-dollhouse-design.mjs --input commission.json --output receipt.json --format both
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
