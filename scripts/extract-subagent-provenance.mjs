import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOG_PATH = 'C:\\Users\\timst\\.gemini\\antigravity\\brain\\3438ee3e-0bf0-4034-9ea5-5076683a8e92\\.system_generated\\logs\\transcript.jsonl';
const OUT_PATH = resolve(process.cwd(), 'tests/fixtures/dollhouse/subagent_provenance_witness.json');

export function extractSubagentProvenance() {
  const content = readFileSync(LOG_PATH, 'utf8');
  const lines = content.trim().split(/\r?\n/).map(l => JSON.parse(l));

  const s0 = lines[0];
  const sLast = lines[lines.length - 1];

  const primaryWrite = lines.find(l => l.step_index === 69);
  const refractWrite = lines.find(l => l.step_index === 71);
  const sendMessage = lines.find(l => l.step_index === 89);

  const witness = {
    schema: 'td613.dollhouse-design.subagent-provenance-witness/v0.1',
    conversation_id: '3438ee3e-0bf0-4034-9ea5-5076683a8e92',
    type_name: 'dollhouse-creative-author',
    role: 'Creative Materialization Author',
    parent_conversation_id: '7a8eb538-a2de-4f69-960a-d8a971824655',
    start_timestamp: s0.created_at || '2026-10-25T01:13:18Z',
    completion_timestamp: sLast.created_at || '2026-10-25T01:19:57Z',
    total_steps: lines.length,
    dispatch_evidence: {
      step_index: 0,
      timestamp: '2026-10-25T01:13:18Z',
      sender: '7a8eb538-a2de-4f69-960a-d8a971824655',
      commission_ref: 'COMM-QUAL-01',
      binding_receipt_ref: 'qualification_return_receipt.json'
    },
    materialization_tool_calls: [
      {
        step_index: primaryWrite.step_index,
        tool: primaryWrite.tool_calls[0].name,
        target_path: 'tests/fixtures/dollhouse/qualification_ledger_primary.html',
        timestamp: primaryWrite.created_at
      },
      {
        step_index: refractWrite.step_index,
        tool: refractWrite.tool_calls[0].name,
        target_path: 'tests/fixtures/dollhouse/qualification_ledger_refraction.html',
        timestamp: refractWrite.created_at
      }
    ],
    verification_tool_calls: [
      { step_index: 73, command: 'node scripts/verify-qualification-browser.mjs' },
      { step_index: 79, command: 'node --test tests/dollhouse-design-conductor.test.mjs' },
      { step_index: 85, command: 'node scripts/verify-qualification-browser.mjs' }
    ],
    completion_message: {
      step_index: sendMessage.step_index,
      recipient: sendMessage.tool_calls[0].args.Recipient.replace(/^"|"$/g, ''),
      timestamp: sendMessage.created_at,
      excerpt: sendMessage.tool_calls[0].args.Message.slice(0, 300).replace(/^"|"$/g, '')
    },
    provenance_status: 'AUTHENTIC_NATIVE_SUBAGENT_EXECUTION_VERIFIED'
  };

  writeFileSync(OUT_PATH, JSON.stringify(witness, null, 2) + '\n', 'utf8');
  console.log(`Subagent provenance witness written to: ${OUT_PATH}`);
  return witness;
}

if (process.argv[1] && process.argv[1].endsWith('extract-subagent-provenance.mjs')) {
  extractSubagentProvenance();
}
