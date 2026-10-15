// Consumer tutorial over the installed field. Illustrations carry no execution
// credit and never replace the underlying observed request relation.
export const LOOM_TUTORIAL_OPERATORS = Object.freeze([
  { glyph: 'à', relations: ['gathering'], family: 'phi-gossamer', label: 'Choose a question' },
  { glyph: 'à · cōl', relations: ['gathering', 'protected_continuity'], family: 'moire-shear', label: 'Choose what to share' },
  { glyph: '上', relations: ['created_potential'], family: 'phasonic-rise', label: 'Review the request' },
  { glyph: '出 · cōl', relations: ['release','protected_continuity'], family: 'gradient-stampede', label: 'Preview sending' },
  { glyph: '米 · hõt · cōl', relations: ['recurrence','bounded_emergence','protected_continuity'], family: 'revisit-lemniscate', label: 'Check privacy' },
  { glyph: '下 · hõt', relations: ['released_tendency','bounded_emergence'], family: 'threnodic-gossamer', label: 'Review the answer' },
  { glyph: '𝄐', relations: ['structural_rest'], family: 'quiet-recurrence', label: 'Your own task' }
].map(item => Object.freeze({ ...item, relations: Object.freeze(item.relations) })));

export function loomTutorialPresentation(step, remix = null) {
  const operator = LOOM_TUTORIAL_OPERATORS[step];
  if (!operator) throw new TypeError('Unknown Loom tutorial step.');
  return {
    tutorial_operator: { step, glyph: operator.glyph, relations: [...operator.relations], evidence_class: 'TUTORIAL_ILLUSTRATION_ONLY' },
    flowcore_choreography: { id: `tutorial-${step}-${remix?.id ?? 'default'}`, relations: [...operator.relations], family: remix?.family ?? operator.family }
  };
}

/**
 * First-paint overture: the eight relation families share the existing 39
 * carrier field and AnimationCoordinator clock. This is a presentation score,
 * not an observed request, authority event, provider invocation or custody act.
 * It intentionally has no tutorial_operator: binding one would reduce every
 * visible carrier to the first lesson's à relation.
 */
export function loomOpeningPresentation(score) {
  const canonical = ['recurrence','gathering','protected_continuity','created_potential',
    'release','released_tendency','bounded_emergence','structural_rest'];
  const candidate = Array.isArray(score?.relations) ? score.relations : canonical;
  const relations = [...new Set(candidate.filter(relation=>canonical.includes(relation)))];
  const complete = relations.length===canonical.length && canonical.every(relation=>relations.includes(relation));
  return {
    tutorial_operator: null,
    flowcore_choreography: {
      id: `ingress-overture-${score?.id ?? 'full-ensemble'}`,
      relations: complete ? relations : canonical,
      family: score?.family ?? 'phi-gossamer',
      // Exactly 39 slots: five of each relation, with four rests.
      // Interleaving distributes all relations through the renderer's depth planes.
      presentation_slots: Array.from({length:39},(_,index)=>canonical[index%8]),
      evidence_class: 'TUTORIAL_ILLUSTRATION_ONLY'
    }
  };
}
