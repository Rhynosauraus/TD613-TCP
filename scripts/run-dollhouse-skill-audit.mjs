#!/usr/bin/env node

/**
 * @fileoverview TD613 Dollhouse Native Skill CLI Runner.
 *
 * Command-line entrypoint for the /dollhouse-audit Antigravity skill:
 *   node scripts/run-dollhouse-skill-audit.mjs [options]
 *
 * Options:
 *   --input, -i <path>        Path to input JSON audit specification
 *   --role, -r <role>         Specialist role to execute (repeatable or comma-separated)
 *   --no-orchestrator         Skip Orchestrator adjudication
 *   --source, -s <rev>        Explicit target source revision
 *   --scope <task>            Declared task / audit scope
 *   --class <class>           Evidence class (e.g. SYNTHETIC_TEST_FIXTURE)
 *   --evidence, -e <ref>      Evidence reference (repeatable)
 *   --output, -o <path>       Output path for receipt artifact (.md or .json)
 *   --format <mode>           Console output format: human (default), json, or both
 *   --help, -h                Show this help message
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runDollhouseSkillAudit, ALL_CANONICAL_ROLES } from '../app/engine/dollhouse-skill-dispatcher.js';

function printHelp() {
  console.log(`
TD613 Dollhouse Native Skill Audit Runner
Usage: node scripts/run-dollhouse-skill-audit.mjs [options]

Options:
  --input, -i <path>        Path to input JSON audit specification
  --role, -r <role>         Specialist role to execute (repeatable or comma-separated: PEDAGOGUE, APERTURE, ATLAS, FADT, TEMPORAL_CUSTODIAN)
  --no-orchestrator         Skip Orchestrator adjudication (execute specialists standalone)
  --source, -s <rev>        Target source revision / commit SHA
  --scope <task>            Declared task and evaluation scope
  --class <class>           Evidence class (SYNTHETIC_TEST_FIXTURE, SOURCE_CODE_AUDIT, etc.)
  --evidence, -e <ref>      Evidence reference (repeatable)
  --output, -o <path>       Output path to save receipt artifact (.md, .json, or base path)
  --format <mode>           Console output format: 'human' (default), 'json', or 'both'
  --help, -h                Show this help message

Examples:
  # Run complete five-specialist audit with Orchestrator from JSON specification
  node scripts/run-dollhouse-skill-audit.mjs --input audit-spec.json

  # Run focused Atlas and FADT custody audit
  node scripts/run-dollhouse-skill-audit.mjs -r ATLAS -r FADT --scope "CUSTODY_RELATION_AUDIT"

  # Run standalone Pedagogue check with JSON console output
  node scripts/run-dollhouse-skill-audit.mjs -r PEDAGOGUE --no-orchestrator --format json
`);
}

async function parseArgs(args) {
  const options = {
    roles: [],
    include_orchestrator: true,
    evidence_references: [],
    format: 'human',
    input_file: null,
    output_file: null,
    source_revision: null,
    task_scope: null,
    evidence_class: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      return options;
    }

    if (arg === '--input' || arg === '-i') {
      options.input_file = args[++i];
    } else if (arg === '--role' || arg === '-r') {
      const val = args[++i];
      if (val) {
        val.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).forEach(r => options.roles.push(r));
      }
    } else if (arg === '--no-orchestrator') {
      options.include_orchestrator = false;
    } else if (arg === '--source' || arg === '-s') {
      options.source_revision = args[++i];
    } else if (arg === '--scope') {
      options.task_scope = args[++i];
    } else if (arg === '--class') {
      options.evidence_class = args[++i];
    } else if (arg === '--evidence' || arg === '-e') {
      options.evidence_references.push(args[++i]);
    } else if (arg === '--output' || arg === '-o') {
      options.output_file = args[++i];
    } else if (arg === '--format') {
      options.format = String(args[++i] || 'human').toLowerCase();
    }
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);
  const cliOpts = await parseArgs(args);

  if (cliOpts.help) {
    printHelp();
    process.exit(0);
  }

  let auditPayload = {};

  if (cliOpts.input_file) {
    try {
      const content = await readFile(resolve(cliOpts.input_file), 'utf8');
      auditPayload = JSON.parse(content);
    } catch (err) {
      console.error(`Error reading input file (${cliOpts.input_file}): ${err.message}`);
      process.exit(2);
    }
  }

  // CLI flags override input JSON fields
  if (cliOpts.roles.length > 0) {
    auditPayload.roles = cliOpts.roles;
  }
  if (!cliOpts.include_orchestrator) {
    auditPayload.include_orchestrator = false;
  }
  if (cliOpts.source_revision) {
    auditPayload.source_revision = cliOpts.source_revision;
  }
  if (cliOpts.task_scope) {
    auditPayload.task_scope = cliOpts.task_scope;
  }
  if (cliOpts.evidence_class) {
    auditPayload.evidence_class = cliOpts.evidence_class;
  }
  if (cliOpts.evidence_references.length > 0) {
    auditPayload.evidence_references = [
      ...(auditPayload.evidence_references || []),
      ...cliOpts.evidence_references
    ];
  }
  if (cliOpts.output_file) {
    auditPayload.artifact_path = cliOpts.output_file;
  }

  const result = await runDollhouseSkillAudit(auditPayload);

  if (cliOpts.format === 'json') {
    console.log(JSON.stringify(result.machine_receipt, null, 2));
  } else if (cliOpts.format === 'both') {
    console.log(result.human_receipt);
    console.log('\n--- MACHINE RECEIPT JSON ---\n');
    console.log(JSON.stringify(result.machine_receipt, null, 2));
  } else {
    console.log(result.human_receipt);
  }

  process.exitCode = result.exit_code;
}

main().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
