import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sample = (n) => readFileSync(new URL(`../samples/${n}`, import.meta.url), 'utf8')
const mod = (n) => import(`../src/${n}.mjs`)
const run = (n, args = []) => spawnSync(process.execPath, [fileURLToPath(new URL(`../src/${n}.mjs`, import.meta.url)), ...args], { encoding: 'utf8' })
const samplePath = (n) => fileURLToPath(new URL(`../samples/${n}`, import.meta.url))

test('35 rotation de sauvegardes : politique, garde-fous, simulation sans suppression', async () => {
  const { backupDate, plan } = await mod('backup-rotate')
  assert.equal(backupDate('db-2026-10-05.enc', 0).toISOString().slice(0, 10), '2026-10-05'); assert.equal(backupDate('db_20261005.sql', 0).toISOString().slice(0, 10), '2026-10-05'); assert.equal(backupDate('db-2026-13-45.enc', 86_400_000).toISOString().slice(0, 10), '1970-01-02')
  const files = Array.from({ length: 26 }, (_, i) => ({ name: `b-2026-10-${String(i + 1).padStart(2, '0')}.enc`, date: new Date(Date.UTC(2026, 9, i + 1)) }))
  const p = plan(files, { daily: 3, weekly: 2, monthly: 1 }, new Date('2026-10-26T00:00:00Z'))
  assert.deepEqual(p.keep.map((f) => f.name.slice(-6, -4)).sort(), ['01', '12', '19', '24', '25', '26']); assert.equal(p.remove.length, 20)
  assert.deepEqual(p.keep.find((f) => f.name.endsWith('19.enc')).why, ['hebdomadaire'])
  const dir = mkdtempSync(join(tmpdir(), 'rot-')); for (const f of files.slice(0, 10)) writeFileSync(join(dir, f.name), 'x'); writeFileSync(join(dir, 'notes.txt'), 'à garder')
  const sim = run('backup-rotate', [dir, '--pattern', '.enc', '--daily', '2', '--weekly', '0', '--monthly', '0'])
  assert.equal(sim.status, 0); assert.match(sim.stdout, /simulation/); assert.equal(existsSync(join(dir, 'b-2026-10-01.enc')), true)
  assert.equal(run('backup-rotate', [dir, '--apply']).status, 1)
  run('backup-rotate', [dir, '--pattern', '.enc', '--daily', '2', '--weekly', '0', '--monthly', '0', '--apply'])
  assert.equal(existsSync(join(dir, 'b-2026-10-01.enc')), false); assert.equal(existsSync(join(dir, 'b-2026-10-10.enc')), true); assert.equal(existsSync(join(dir, 'notes.txt')), true)
})
