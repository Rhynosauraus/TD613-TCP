const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const intake=require('./encyclopedia-intake.cjs');
const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Usage: node scripts/stage-encyclopedia-record.cjs input.json proposal.json');
const text=fs.readFileSync(input,'utf8'),schema=JSON.parse(fs.readFileSync(path.join(__dirname,'encyclopedia-intake-schema.json'))),report=intake.inspect(text,schema);
if(!report.valid)throw new Error(report.errors.join('\n'));
const proposal={schema:'td613.research-proposal/v1',disposition:'PROPOSED',input_sha256:createHash('sha256').update(text).digest('hex'),original_json:text,record:report.record,authority:report.authority};
fs.writeFileSync(output,JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({disposition:proposal.disposition,record_id:proposal.record.record_id,input_sha256:proposal.input_sha256,publication_eligible:report.publication_eligible,output}));
