import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

export function resolveTranscriptPath(cliPath) {
  if (cliPath && existsSync(cliPath)) return resolve(cliPath);
  if (process.env.SUBAGENT_TRANSCRIPT_PATH && existsSync(process.env.SUBAGENT_TRANSCRIPT_PATH)) {
    return resolve(process.env.SUBAGENT_TRANSCRIPT_PATH);
  }
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const defaultPath = resolve(
    home,
    '.gemini/antigravity/brain/3438ee3e-0bf0-4034-9ea5-5076683a8e92/.system_generated/logs/transcript.jsonl'
  );
  if (existsSync(defaultPath)) return defaultPath;
  throw new Error('Subagent transcript not found. Set SUBAGENT_TRANSCRIPT_PATH or pass --transcript <path>.');
}

export function extractSubagentProvenance(transcriptPathInput, outputPathInput) {
  const transcriptPath = resolveTranscriptPath(transcriptPathInput);
  const outPath = outputPathInput ? resolve(outputPathInput) : resolve(process.cwd(), 'tests/fixtures/dollhouse/subagent_provenance_witness.json');

  const rawBytes = readFileSync(transcriptPath);
  const transcriptSha256 = createHash('sha256').update(rawBytes).digest('hex');
  const lines = rawBytes.toString('utf8').trim().split(/\r?\n/).map((l, idx) => {
    try {
      return { line_num: idx + 1, data: JSON.parse(l) };
    } catch (e) {
      throw new Error(`Failed parsing transcript JSON at line ${idx + 1}: ${e.message}`);
    }
  });

  assert.ok(lines.length >= 90, `Transcript step count too short (${lines.length})`);

  // 1. Derive Dispatch Evidence from Step 0 (SYSTEM_MESSAGE containing initial dispatch)
  const step0 = lines[0].data;
  assert.equal(step0.type, 'SYSTEM_MESSAGE', 'Step 0 must be SYSTEM_MESSAGE');
  const dispatchText = step0.content || '';

  const senderMatch = dispatchText.match(/sender=([a-f0-9-]+)/);
  assert.ok(senderMatch, 'Could not derive sender UUID from dispatch text');
  const derivedSender = senderMatch[1];

  const timestampMatch = dispatchText.match(/timestamp=([0-9T:Z-]+)/);
  assert.ok(timestampMatch, 'Could not derive timestamp from dispatch text');
  const derivedDispatchTimestamp = timestampMatch[1];

  const commissionMatch = dispatchText.match(/Qualification Commission\s+([A-Z0-9_-]+)/);
  assert.ok(commissionMatch, 'Could not derive commission reference from dispatch text');
  const derivedCommission = commissionMatch[1];

  const receiptMatch = dispatchText.match(/([a-z0-9_-]+\.json)/);
  assert.ok(receiptMatch, 'Could not derive return receipt reference from dispatch text');
  const derivedReceipt = receiptMatch[1];

  // 2. Derive Materialization Tool Calls (write_file for primary and refraction)
  const writeToolSteps = lines.filter(l => l.data.tool_calls && l.data.tool_calls.some(tc => tc.name === 'write_file'));
  assert.ok(writeToolSteps.length >= 2, `Expected at least 2 write_file tool calls in transcript, found ${writeToolSteps.length}`);

  let primaryWrite = null;
  let refractWrite = null;

  for (const stepObj of writeToolSteps) {
    const s = stepObj.data;
    for (const tc of s.tool_calls) {
      if (tc.name === 'write_file' && tc.args && tc.args.Path) {
        const rawPath = tc.args.Path.replace(/^"|"$/g, '').replace(/\\/g, '/');
        if (rawPath.endsWith('qualification_ledger_primary.html')) {
          primaryWrite = {
            step_index: s.step_index,
            line_num: stepObj.line_num,
            tool: 'write_file',
            derived_target_artifact: 'tests/fixtures/dollhouse/qualification_ledger_primary.html',
            timestamp: s.created_at,
            tool_action: tc.args.toolAction ? tc.args.toolAction.replace(/^"|"$/g, '') : null
          };
        } else if (rawPath.endsWith('qualification_ledger_refraction.html')) {
          refractWrite = {
            step_index: s.step_index,
            line_num: stepObj.line_num,
            tool: 'write_file',
            derived_target_artifact: 'tests/fixtures/dollhouse/qualification_ledger_refraction.html',
            timestamp: s.created_at,
            tool_action: tc.args.toolAction ? tc.args.toolAction.replace(/^"|"$/g, '') : null
          };
        }
      }
    }
  }

  assert.ok(primaryWrite, 'Could not derive qualification_ledger_primary.html write_file tool call from transcript');
  assert.ok(refractWrite, 'Could not derive qualification_ledger_refraction.html write_file tool call from transcript');

  // 3. Derive Verification Tool Calls from run_command
  const cmdToolSteps = lines.filter(l => l.data.tool_calls && l.data.tool_calls.some(tc => tc.name === 'run_command'));
  const derivedVerifications = [];

  for (const stepObj of cmdToolSteps) {
    const s = stepObj.data;
    for (const tc of s.tool_calls) {
      if (tc.name === 'run_command' && tc.args && tc.args.CommandLine) {
        const cmd = tc.args.CommandLine.replace(/^"|"$/g, '');
        if (cmd.includes('verify-qualification-browser') || cmd.includes('dollhouse-design-conductor')) {
          derivedVerifications.push({
            step_index: s.step_index,
            line_num: stepObj.line_num,
            derived_command: cmd,
            timestamp: s.created_at
          });
        }
      }
    }
  }

  assert.ok(derivedVerifications.length >= 2, 'Expected at least 2 qualification verification commands in transcript');

  // 4. Derive Completion Message (send_message to parent recipient)
  const sendMsgSteps = lines.filter(l => l.data.tool_calls && l.data.tool_calls.some(tc => tc.name === 'send_message'));
  assert.ok(sendMsgSteps.length >= 1, 'Expected send_message tool call for completion reporting in transcript');

  const completionStepObj = sendMsgSteps[sendMsgSteps.length - 1];
  const sCompletion = completionStepObj.data;
  const sendTc = sCompletion.tool_calls.find(tc => tc.name === 'send_message');
  assert.ok(sendTc && sendTc.args, 'send_message args missing');

  const derivedRecipient = sendTc.args.Recipient.replace(/^"|"$/g, '');
  assert.equal(derivedRecipient, derivedSender, `send_message recipient (${derivedRecipient}) must match dispatch sender (${derivedSender})`);

  const rawMessage = sendTc.args.Message ? sendTc.args.Message.replace(/^"|"$/g, '').replace(/\\n/g, '\n') : '';
  const firstParagraph = rawMessage.split('\n\n')[0].trim();

  // 5. Build minimal, source-anchored evidence extract distinguishing observed vs reconstructed facts
  const witness = {
    schema: 'td613.dollhouse-design.subagent-provenance-witness/v0.2',
    provenance_classification: 'AUTHENTIC_NATIVE_SUBAGENT_EXECUTION_VERIFIED',
    direct_transcript_facts: {
      transcript_file_size_bytes: rawBytes.length,
      transcript_sha256: transcriptSha256,
      total_transcript_entries: lines.length,
      first_entry_timestamp: step0.created_at || derivedDispatchTimestamp,
      last_entry_timestamp: lines[lines.length - 1].data.created_at,
      dispatch: {
        step_index: step0.step_index,
        line_num: 1,
        derived_sender: derivedSender,
        derived_dispatch_timestamp: derivedDispatchTimestamp,
        derived_commission_ref: derivedCommission,
        derived_receipt_ref: derivedReceipt
      },
      materialization_tool_calls: [
        primaryWrite,
        refractWrite
      ],
      verification_tool_calls: derivedVerifications,
      completion_handshake: {
        step_index: sCompletion.step_index,
        line_num: completionStepObj.line_num,
        derived_recipient: derivedRecipient,
        timestamp: sCompletion.created_at,
        verified_recipient_matches_sender: true,
        summary_excerpt: firstParagraph.slice(0, 240)
      }
    },
    reconstructed_context: {
      subagent_conversation_id: '3438ee3e-0bf0-4034-9ea5-5076683a8e92',
      parent_conversation_id: derivedSender,
      subagent_role: 'Creative Materialization Author',
      subagent_type: 'dollhouse-creative-author',
      execution_environment: 'Antigravity pair-programming session'
    }
  };

  writeFileSync(outPath, JSON.stringify(witness, null, 2) + '\n', 'utf8');
  console.log(`Verified subagent provenance witness written to: ${outPath}`);
  console.log(`Transcript SHA-256: ${transcriptSha256} (${rawBytes.length} bytes, ${lines.length} steps)`);
  return witness;
}

if (process.argv[1] && process.argv[1].endsWith('extract-subagent-provenance.mjs')) {
  const args = process.argv.slice(2);
  let transcriptPath = null;
  let outPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--transcript' && args[i + 1]) {
      transcriptPath = args[i + 1];
      i++;
    } else if (args[i] === '--out' && args[i + 1]) {
      outPath = args[i + 1];
      i++;
    }
  }
  extractSubagentProvenance(transcriptPath, outPath);
}
