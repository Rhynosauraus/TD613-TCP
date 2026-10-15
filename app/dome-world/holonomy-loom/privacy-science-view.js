// The Loom privacy laboratory executes the retained quantitative kernels.
// Synthetic models are a teaching surface; local request observations are
// separate from externally witnessed five-surface empirical measurements.
import { OBSERVER_CASES, getObserverCase } from './observer-cases.js';
import { evaluatePortableLoomGoldenEggEvidence, createPortableLoomGoldenEggKernel } from '../../engine/portable-loom-golden-egg-kernel.js';
import { buildPortableLoomResearchMathContract } from '../../engine/portable-loom-research-math.js';

export const LOOM_PRIVACY_SCIENCE_VIEW_SCHEMA = 'td613.loom.privacy-science-view/v0.1';

export function calculateLoomPrivacyScience(caseId='parity', selectedChannels=null) {
  const chosen=getObserverCase(caseId);
  const channels=selectedChannels ?? chosen.channels.map(item=>item.id);
  const evaluation=evaluatePortableLoomGoldenEggEvidence({
    finite_channel_model:chosen, selected_channels:channels
  });
  const contract=createPortableLoomGoldenEggKernel();
  const math=buildPortableLoomResearchMathContract();
  return Object.freeze({
    schema:LOOM_PRIVACY_SCIENCE_VIEW_SCHEMA,
    case_id:chosen.id,
    selected_channels:[...channels],
    model_label:chosen.title,
    model_question:chosen.question,
    model_lesson:chosen.lesson,
    evaluation,
    thresholds:math.thresholds,
    equations:math.equations,
    requirements:contract.mathematical_target,
    // Real observations are absent. A mathematical model's successful
    // finite enumeration never fills one of these five empirical surfaces.
    measured_surfaces:Object.freeze({...contract.observation}),
    empirical_credit:0,
    golden_egg_earned:false
  });
}

const rounded=value=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(3):'unmeasured';
function appendText(doc,container,tag,text,className=''){
  const node=doc.createElement(tag);node.textContent=text;
  if(className)node.className=className;
  container.append(node);
  return node;
}

/** Small encounter with the same finite kernel used by the research view. */
export function mountLoomObserverPreview(host,{environment=globalThis}={}){
  const doc=environment.document;
  appendText(doc,host,'p','Declared finite model · calculated locally');
  const channels=doc.createElement('fieldset');
  appendText(doc,channels,'legend','Clues available to the observer');
  for(const [index,id] of ['first','second','third'].entries()){
    const label=doc.createElement('label'),input=doc.createElement('input');
    input.type='checkbox';input.value=id;input.checked=true;
    label.append(input,doc.createTextNode(`Clue ${index+1}`));channels.append(label);
  }
  const results=doc.createElement('div');results.className='loom-observer-results';results.setAttribute('aria-live','polite');
  const lesson=appendText(doc,host,'p','');
  const render=()=>{
    const selected=[...channels.querySelectorAll('input:checked')].map(input=>input.value);
    const result=calculateLoomPrivacyScience('parity',selected).evaluation.finite_synthetic_calculation;
    results.replaceChildren();
    for(const [name,route] of [['Control',result.routes.control],['Protected',result.routes.protected]]){
      const p=appendText(doc,results,'p',name);
      appendText(doc,p,'strong',`${route.selected_view.total_bits.toFixed(1)} bits`);
      appendText(doc,p,'span',`Optimal target recovery: ${(route.selected_view.total_recovery*100).toFixed(0)}%`);
    }
    lesson.textContent=selected.length===3?'All three control clues reveal the bit. Every pair hides it. The protected route keeps this target hidden in the declared model.':'This selected view hides the target bit. Add the remaining clues to inspect the joined result.';
    host.dataset.selectedChannels=selected.join(',');
  };
  channels.addEventListener('change',render);host.append(channels,results,lesson);render();
  return Object.freeze({refresh:render});
}

export function mountLoomPrivacyScienceView(host,{environment=globalThis,getLocalFacts=()=>({})}={}){
  if(!host)throw new TypeError('Privacy mathematics needs a visible host.');
  const doc=environment.document;
  const container=host;
  appendText(doc,container,'h3','Inspect what the result rests on.');
  appendText(doc,container,'p','The observer test calculates what disclosed traces reveal under a declared model. The route companion carries executable transport and holonomy mathematics. The episode record shows which measurements came from the same captured exchange.');
  const tabs=doc.createElement('div');tabs.className='loom-research-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Research evidence');
  const panels=['Observer test','Route mathematics','Episode evidence'].map((label,index)=>{
    const button=doc.createElement('button');button.type='button';button.textContent=label;button.id=`loomResearchTab${index}`;button.setAttribute('role','tab');
    const panel=doc.createElement('section');panel.className='loom-research-panel';panel.id=`loomResearchPanel${index}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);button.setAttribute('aria-controls',panel.id);
    const activate=()=>panels.forEach((entry,i)=>{entry.panel.hidden=i!==index;entry.button.setAttribute('aria-selected',String(i===index));entry.button.tabIndex=i===index?0:-1;});
    button.addEventListener('click',activate);
    button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3;panels[next].button.click();panels[next].button.focus();}});
    tabs.append(button);container.append(panel);return {button,panel};
  });
  container.prepend(tabs);panels[0].button.click();
  const math=buildPortableLoomResearchMathContract();
  appendText(doc,panels[1].panel,'h4','Executable transport and holonomy mathematics');
  appendText(doc,panels[1].panel,'p','The standard portable artifact carries source-checked F₃₁ transport, noncommuting GL₂(F₃₁) holonomy, and the finite feasible-region calculation. Its embedded fixture report is computed locally when exported. A receiving model can inspect that report; a new episode requires a fresh local execution.');
  appendText(doc,panels[1].panel,'pre','node portable-loom-tomography-audit.mjs --self-check\nnode portable-loom-tomography-audit.mjs --episode /path/to/captured-episode.json');
  const source=doc.createElement('a');source.href='https://github.com/tauric-diana-613/TD613-TCP/blob/main/scripts/export-standard-portable-loom.mjs';source.textContent='Inspect the canonical exporter and source manifest ↗';source.target='_blank';source.rel='noopener noreferrer';panels[1].panel.append(source);
  const detail=doc.createElement('details');appendText(doc,detail,'summary','Inspect the calculated research contract');appendText(doc,detail,'pre',JSON.stringify(math,null,2).replaceAll('Golden Egg','five-surface').replaceAll('golden_egg','five_surface').replaceAll('golden-egg','five-surface'));panels[1].panel.append(detail);
  appendText(doc,panels[2].panel,'h4','Five surfaces from one captured episode');
  appendText(doc,panels[2].panel,'p','L: observer leakage ≤0.5 bits. R: authorized-work reconstruction distance ≤0.2. J: preregistered joining synergy ≤0.1 bits. G: independently grounded geometry with calibration and uncertainty. C: actual matched control/protected returns.');
  appendText(doc,panels[2].panel,'p','This view has no captured empirical episode. Qualification requires one immutable episode, continuous custody, preregistered distinct routes, a common comparison frame, and all five surfaces.');
  appendText(doc,panels[2].panel,'p','Conditional information remains separate from historical L. Finite signed excess remains separate from empirical J. Animation supplies no measured G.');
  host=panels[0].panel;
  const headline=appendText(doc,host,'h4','Finite observer calculation');
  headline.className='loom-science-title';
  appendText(doc,host,'p','Select the observed channels and inspect the complete declared probability law.','loom-science-explanation');
  const options=doc.createElement('label');
  options.textContent='Declared mathematical example';
  const select=doc.createElement('select');
  select.setAttribute('aria-label','Choose a finite observer-channel example');
  for(const item of OBSERVER_CASES){
    const option=doc.createElement('option');option.value=item.id;option.textContent=item.title;
    if(item.id==='parity')option.selected=true;
    select.append(option);
  }
  options.append(select);host.append(options);
  const channels=doc.createElement('fieldset');channels.className='loom-science-channels';
  appendText(doc,channels,'legend','Observer channels included in the calculation');host.append(channels);
  const local=appendText(doc,host,'p','','loom-science-local');
  const results=doc.createElement('section');results.className='loom-science-results';results.setAttribute('aria-live','polite');host.append(results);
  const receipt=doc.createElement('details');
  appendText(doc,receipt,'summary','Inspect the calculations and measurement contract');
  const machine=appendText(doc,receipt,'pre','','loom-science-receipt');
  host.append(receipt);
  const checkedChannels=()=>[...channels.querySelectorAll('input:checked')].map(node=>node.value);
  let latest=null;
  const render=()=>{
    latest=calculateLoomPrivacyScience(select.value,checkedChannels());
    const out=latest.evaluation.finite_synthetic_calculation;
    results.replaceChildren();
    appendText(doc,results,'p',latest.model_question,'loom-science-question');
    if(out?.status==='INADMISSIBLE'){
      appendText(doc,results,'p',out.errors.join('; '));return;
    }
    const control=out.routes.control,protectedRoute=out.routes.protected;
    const table=doc.createElement('table');table.className='loom-science-table';
    const header=doc.createElement('tr');
    for(const heading of ['Finite model','Leakage I(H;baseline, channels)','New leakage after baseline','Optimal secret recovery','Signed clue overlap / excess','Authorized answer accuracy']){
      appendText(doc,header,'th',heading);
    }
    table.append(header);
    for(const [label,row] of [['Without protection',control],['With protection',protectedRoute]]){
      const tr=doc.createElement('tr');
      const view=row.selected_view;
      for(const [index,value] of [label,rounded(view?.total_bits),rounded(view?.additional_bits),rounded(view?.total_recovery),rounded(row.signed_excess_bits),rounded(row.authorized_accuracy)].entries()){
        const cell=appendText(doc,tr,'td',value);
        cell.dataset.label=['Finite model','Observed total information','New leakage after baseline','Optimal secret recovery','Signed clue excess','Authorized answer accuracy'][index];
      }
      table.append(tr);
      if(row.missing_channels.length)appendText(doc,results,'p',label+': missing '+row.missing_channels.join(', ')+'. Full-channel calculation HELD; missing evidence is never treated as zero.');
    }
    results.append(table);
    appendText(doc,results,'p',latest.model_lesson,'loom-science-lesson');
    appendText(doc,results,'p','These values come from enumerating the declared finite probability law. The signed excess is a diagnostic—not the historical joining-synergy J. Answer accuracy is not the authorized-work reconstruction distance R. Conditional leakage is not the historical observer leakage L.','loom-science-scope');
    appendText(doc,results,'p','Empirical five-surface measurement: L unmeasured · R unmeasured · J unmeasured · G unmeasured · C unobserved. A valid comparison requires one immutable episode, continuous custody, a common comparison frame, independently grounded geometry, and actual matched control/protected returns.','loom-science-unmeasured');
    // Consumer receipt retains every finite numeric result and evidentiary
    // qualifier without exposing the internal experiment nickname as UI copy.
    // Canonical internal research/export schemas remain unchanged.
    const { golden_egg: _internalResearchName, ...finiteCeiling }=out.ceiling;
    machine.textContent=JSON.stringify({
      schema:latest.schema,
      synthetic_model:{...out,ceiling:{...finiteCeiling,five_surface_qualification:_internalResearchName}},
      five_surface_target:{...latest.requirements,
        J:latest.requirements.J.replaceAll('Golden Egg','five-surface')},
      equations:latest.equations,
      thresholds:latest.thresholds,
      empirical_surfaces:latest.measured_surfaces,
      empirical_credit:latest.empirical_credit,
      five_surface_qualified:latest.golden_egg_earned
    },null,2);
  };
  const renderChannels=()=>{
    channels.querySelectorAll('label').forEach(node=>node.remove());
    for(const c of getObserverCase(select.value).channels){
      const label=doc.createElement('label'),checkbox=doc.createElement('input');
      checkbox.type='checkbox';checkbox.value=c.id;checkbox.checked=true;
      checkbox.addEventListener('change',render);
      label.append(checkbox,doc.createTextNode(' '+c.label));channels.append(label);
    }
    render();
  };
  const refresh=()=>{
    const facts=getLocalFacts();
    const selected=Number.isInteger(facts.selected_files)?facts.selected_files:0;
    const withheld=Number.isInteger(facts.withheld_files)?facts.withheld_files:0;
    local.textContent='Current Loom session · '+selected+' selected file(s), '+withheld+' withheld file(s); '+
      (facts.session_prepared?'local request prepared':'request not yet prepared')+'; '+
      (facts.local_return_admitted?'return admitted locally':'no locally admitted return')+'; '+
      (facts.gate_report_count??0)+' bounded gate report(s). These are local workflow facts, not measured L/R/J/G/C.';
  };
  select.addEventListener('change',renderChannels);
  renderChannels();refresh();
  return Object.freeze({refresh,inspect:()=>latest});
}
