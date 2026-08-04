/**
 * Verifies that every contract function name referenced from apps/web's
 * source actually exists on the deployed PolicyComplianceGate contract,
 * with a matching arity — catches drift between the Python contract and
 * the frontend call sites before it becomes a runtime "method not found".
 *
 * Usage:
 *   cd contracts
 *   pnpm verify-schema
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { config } from 'dotenv';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '../.env');
const WEB_SRC = join(__dirname, '../../apps/web/src');

config({ path: ENV_PATH });

const CONTRACT_ADDRESS = (process.env.GENLAYER_CONTRACT_ADDRESS ||
  '0x6EfCE1EaA68DEd9C09b27DAd88EFA8804c72E600') as `0x${string}`;

interface CallSite {
  functionName: string;
  argCount: number | null; // null when arity can't be statically determined (spread/dynamic)
  file: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (['.ts', '.tsx'].includes(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Matches writeContractAsUser(address, 'fn', [a, b, c]) and
 * readContractPublic('fn', [a, b]) call sites, capturing the function name
 * and a best-effort count of the args array's top-level elements.
 */
function extractCallSites(files: string[]): CallSite[] {
  const sites: CallSite[] = [];
  const pattern =
    /(writeContractAsUser|readContractPublic)\(\s*(?:[^,]+,\s*)?'([a-zA-Z_][a-zA-Z0-9_]*)'\s*(?:,\s*\[([^\]]*)\])?/gs;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content))) {
      const [, , functionName, argsRaw] = match;
      let argCount: number | null = null;
      if (argsRaw !== undefined) {
        const trimmed = argsRaw.trim();
        argCount = trimmed === '' ? 0 : trimmed.replace(/,\s*$/, '').split(',').length;
      }
      sites.push({ functionName, argCount, file: file.replace(WEB_SRC, 'src') });
    }
  }
  return sites;
}

async function main() {
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Chain: ${studionet.name}\n`);

  const client = createClient({ chain: studionet, account: createAccount() });
  const schema = await client.getContractSchema(CONTRACT_ADDRESS);
  const methodNames = new Set(Object.keys(schema.methods));

  const files = walk(WEB_SRC);
  const callSites = extractCallSites(files);

  // Dedupe by functionName, keeping the widest arg count seen (dynamic
  // call sites without a literal array show up as null and don't affect this).
  const byName = new Map<string, CallSite>();
  for (const site of callSites) {
    const existing = byName.get(site.functionName);
    if (!existing || (existing.argCount === null && site.argCount !== null)) {
      byName.set(site.functionName, site);
    }
  }

  if (byName.size === 0) {
    console.log('No writeContractAsUser/readContractPublic call sites found in apps/web/src.');
    return;
  }

  let failures = 0;
  for (const [functionName, site] of [...byName.entries()].sort()) {
    const exists = methodNames.has(functionName);
    if (!exists) {
      console.log(`FAIL  ${functionName.padEnd(28)} not found on deployed contract (${site.file})`);
      failures++;
      continue;
    }

    const method = schema.methods[functionName];
    const expectedArity = method.params.length;
    if (site.argCount !== null && site.argCount !== expectedArity) {
      console.log(
        `FAIL  ${functionName.padEnd(28)} arity mismatch: contract expects ${expectedArity}, call site passes ${site.argCount} (${site.file})`,
      );
      failures++;
      continue;
    }

    console.log(`PASS  ${functionName.padEnd(28)} arity ${expectedArity} (${site.file})`);
  }

  console.log(`\n${byName.size - failures}/${byName.size} passed.`);
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('verify-schema failed:', err);
  process.exitCode = 1;
});
