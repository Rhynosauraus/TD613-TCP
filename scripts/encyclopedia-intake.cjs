// Shared by the standalone browser and the human-reviewed Git intake tools.
(function(root){
 'use strict';
 function validate(value,schema,path='$',errors=[]){
  const type=Array.isArray(value)?'array':value===null?'null':typeof value;
  if(schema.type&&type!==schema.type){errors.push(path+': expected '+schema.type);return errors}
  if(schema.enum&&!schema.enum.includes(value))errors.push(path+': unrecognized value');
  if(type==='object'){
   for(const key of schema.required||[])if(!(key in value))errors.push(path+'.'+key+': required');
   for(const [key,item] of Object.entries(value)){const child=Object.hasOwn(schema.properties||{},key)?schema.properties[key]:null;if(child)validate(item,child,path+'.'+key,errors);else if(schema.additionalProperties===false)errors.push(path+'.'+key+': unknown field')}
  }
  if(type==='array'){if(schema.minItems&&value.length<schema.minItems)errors.push(path+': too few items');if(schema.maxItems&&value.length>schema.maxItems)errors.push(path+': too many items');for(const [i,item] of value.entries())if(schema.items)validate(item,schema.items,path+'['+i+']',errors)}
  if(type==='string'){if(schema.minLength&&value.length<schema.minLength)errors.push(path+': too short');if(schema.maxLength&&value.length>schema.maxLength)errors.push(path+': too long');if(schema.pattern&&!new RegExp(schema.pattern).test(value))errors.push(path+': invalid format');if(schema.format==='date-time'&&(!/^\d{4}-\d\d-\d\dT/.test(value)||!Number.isFinite(Date.parse(value))))errors.push(path+': invalid timestamp')}
  return errors;
 }
 function inspect(text,schema){
  const errors=[];let record;try{record=JSON.parse(text)}catch(_){return {valid:false,errors:['Input must be one JSON record.']}}
  validate(record,schema,'$',errors);
  if(!record||typeof record!=='object'||Array.isArray(record))return {valid:false,errors,disposition:'PROPOSED'};
  if(Array.isArray(record.sources))for(const [i,s] of record.sources.entries())if(s?.capture_status==='ORIGINAL_CAPTURE'&&!s.sha256)errors.push('$.sources['+i+'].sha256: original captures require their exact digest');
  if(record.supersedes===record.record_id)errors.push('A revision must use a fresh ID.');
  if(record.kind==='experiment'&&!record.experiment)errors.push('$.experiment: experiment records require an episode and execution status');
  if(record.evidence?.disposition==='ADJUDICATION_RECORDED'&&!record.evidence.adjudication_ref)errors.push('$.evidence.adjudication_ref: recorded adjudication requires its source reference');
  return {valid:errors.length===0,errors,record,disposition:'PROPOSED',authority:'Schema validation and declared source fields; human review and source verification remain separate.',publication_eligible:record.visibility==='public'};
 }
 const api=Object.freeze({validate,inspect});if(typeof module==='object'&&module.exports)module.exports=api;else root.TD613Intake=api;
})(typeof window==='object'?window:globalThis);
