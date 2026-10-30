#!/usr/bin/env node
/**
 * Fails (exit 1) if anything that looks like a secret is in tracked files or the web build.
 * Prints only file paths and pattern names — never the matched value.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', 'docs', '.claude']);
const FORBIDDEN_TRACKED = [/^docs\//, /^\.claude\//, /(^|\/)\.env(\..+)?$/];

const PATTERNS = [
  { name: 'Groq API key', regex: /gsk_[A-Za-z0-9]{20,}/ },
  { name: 'Assigned GROQ_API_KEY value', regex: /GROQ_API_KEY\s*[=:]\s*["']?[A-Za-z0-9_-]{8,}/ },
  { name: 'Private key block', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function trackedFiles() {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
    const files = out.split('\0').filter(Boolean);
    if (files.length > 0) return files;
  } catch {
    // Not a git repo yet — fall back to walking the tree.
  }
  return walk(ROOT).map((file) => relative(ROOT, file).replaceAll('\\', '/'));
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return IGNORED_DIRS.has(name) ? [] : walk(full);
    return name === '.env' || name.startsWith('.env.') ? [] : [full];
  });
}

const findings = [];

for (const file of trackedFiles()) {
  if (file !== '.env.example' && FORBIDDEN_TRACKED.some((rule) => rule.test(file))) {
    findings.push(`${file}: must never be committed`);
    continue;
  }
  if (file === 'scripts/secret-scan.mjs' || !existsSync(join(ROOT, file))) continue;
  const content = readFileSync(join(ROOT, file), 'utf8');
  for (const { name, regex } of PATTERNS) {
    if (regex.test(content)) findings.push(`${file}: ${name}`);
  }
}

const webDist = join(ROOT, 'web', 'dist');
if (existsSync(webDist)) {
  for (const file of walk(webDist)) {
    const content = readFileSync(file, 'utf8');
    if (/gsk_|GROQ_API_KEY/.test(content)) {
      findings.push(`${relative(ROOT, file)}: secret reference in client bundle`);
    }
  }
}

if (findings.length > 0) {
  console.error(`Secret scan FAILED (${findings.length}):\n- ${findings.join('\n- ')}`);
  process.exit(1);
}
console.log('Secret scan passed: no secrets or forbidden files found.');
