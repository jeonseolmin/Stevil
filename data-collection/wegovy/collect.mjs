import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const sources = JSON.parse(await readFile(path.join(root, 'sources.json'), 'utf8'));
const args = process.argv.slice(2);
if (args.some(a => a !== '--list')) throw new Error('Supported option: --list');
if (args.includes('--list')) {
  for (const source of sources) console.log(`${source.id}\t${source.url}`);
  process.exit(0);
}
const runId = new Date().toISOString().replaceAll(':', '-') + '-' + randomUUID().slice(0, 8);
const rawDir = path.join(root, 'raw', runId);
const reportDir = path.join(root, 'runs');
await mkdir(rawDir, { recursive: true });
await mkdir(reportDir, { recursive: true });
const results = [];
for (const source of sources) {
  const result = { source_id: source.id, requested_url: source.url,
    collected_at: new Date().toISOString(), status: 'failed', ingest_ready: false };
  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'Stevil-Research-Collector/0.1', Accept: '*/*' },
      signal: AbortSignal.timeout(45000)
    });
    result.http_status = response.status;
    result.final_url = response.url;
    result.content_type = response.headers.get('content-type');
    result.last_modified_header = response.headers.get('last-modified');
    if (!response.ok) throw new Error(`HTTP ${response.status}; no access-control bypass attempted`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 500) throw new Error('Empty or unexpectedly short document');
    if (source.format === 'pdf') {
      if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Response is not a PDF');
    } else {
      const body = bytes.toString('utf8');
      const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
      if (/checking your browser|just a moment|access denied|captcha|robot check/i.test(title)) {
        throw new Error('Challenge page; manual access required');
      }
      if (!/<html|<!doctype html/i.test(body)) throw new Error('Response is not HTML');
      if (!body.toLowerCase().includes(source.expected_marker.toLowerCase())) {
        throw new Error('Expected document marker missing; inspect source manually');
      }
    }
    const filename = `${source.id}.${source.format}`;
    await writeFile(path.join(rawDir, filename), bytes, { flag: 'wx' });
    Object.assign(result, { status: 'downloaded_pending_review', bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      relative_path: `raw/${runId}/${filename}`, revision_date: null,
      validation: 'Basic format only; completeness, scope and latest version require review' });
  } catch (error) {
    result.error = String(error.message ?? error);
  }
  results.push(result);
  await writeFile(path.join(reportDir, `${runId}.json`), JSON.stringify({ run_id: runId, results }, null, 2) + '\n');
  console.log(`${result.source_id}: ${result.status}${result.error ? ' - ' + result.error : ''}`);
}
console.log(`Report: ${path.join(reportDir, runId + '.json')}`);
if (results.some(r => r.status === 'failed')) process.exitCode = 1;
