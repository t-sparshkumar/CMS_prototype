#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  convertDirectusSnapshot,
  isDirectusSnapshot,
} from '../services/directus-snapshot.adapter.js';

const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)));

function main(): void {
  const inputPath = resolve(process.argv[2] ?? resolve(repoRoot, 'snapshot.json'));
  const outputPath = resolve(process.argv[3] ?? resolve(repoRoot, 'cms-schema-snapshot.json'));

  const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;

  if (!isDirectusSnapshot(raw)) {
    console.error('Input file is not a Directus schema snapshot.');
    process.exit(1);
  }

  const converted = convertDirectusSnapshot(raw);
  const { source: _source, warnings, stats, ...snapshot } = converted;

  writeFileSync(outputPath, JSON.stringify(snapshot, null, 2));

  console.log(`Converted Directus snapshot -> ${outputPath}`);
  console.log(`Collections: ${stats.collections} (${stats.folders} folders)`);
  console.log(`Fields: ${stats.fields}`);
  console.log(`Skipped fields: ${stats.skipped_fields}`);
  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    for (const warning of warnings.slice(0, 20)) {
      console.log(`  - ${warning}`);
    }
    if (warnings.length > 20) {
      console.log(`  ... and ${warnings.length - 20} more`);
    }
  }
}

main();
