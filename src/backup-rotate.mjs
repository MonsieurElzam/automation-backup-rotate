#!/usr/bin/env node
/* Rotation de sauvegardes : garde les N dernières, une par semaine et une par mois, et propose de supprimer le reste.
   Simulation par défaut : rien n'est supprimé sans --apply. */
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { isMain, parseArgs, usage, fail } from '../lib/cli.mjs'

const DAY = 86_400_000

/** Date d'une sauvegarde : AAAA-MM-JJ lu dans le nom du fichier, sinon date de modification. */
export function backupDate(name, mtime) {
  const m = name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/)
  if (m) { const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (!Number.isNaN(d.getTime()) && d.getUTCMonth() === +m[2] - 1) return d }
  return new Date(mtime)
}

const weekKey = (d) => { const t = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY); return t.toISOString().slice(0, 10) }
const monthKey = (d) => d.toISOString().slice(0, 7)

/** files : [{ name, date }]. Politique : daily = N plus récentes ; weekly = 1 par semaine sur W semaines ; monthly = 1 par mois sur M mois. */
export function plan(files, { daily = 7, weekly = 4, monthly = 6 } = {}, now = new Date()) {
  const sorted = [...files].sort((a, b) => b.date - a.date)
  const keep = new Map()
  const mark = (f, why) => keep.set(f.name, [...(keep.get(f.name) ?? []), why])
  sorted.slice(0, daily).forEach((f) => mark(f, 'récente'))
  const seenW = new Set(), seenM = new Set()
  for (const f of [...sorted].reverse()) { // la plus ancienne de chaque semaine/mois est conservée
    const age = (now - f.date) / DAY
    if (age <= weekly * 7 && !seenW.has(weekKey(f.date))) { seenW.add(weekKey(f.date)); mark(f, 'hebdomadaire') }
    if (age <= monthly * 31 && !seenM.has(monthKey(f.date))) { seenM.add(monthKey(f.date)); mark(f, 'mensuelle') }
  }
  return { keep: sorted.filter((f) => keep.has(f.name)).map((f) => ({ ...f, why: keep.get(f.name) })), remove: sorted.filter((f) => !keep.has(f.name)) }
}

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2), ['help', 'apply'])
  usage(`
Usage : node src/backup-rotate.mjs dossier [--daily 7] [--weekly 4] [--monthly 6] [--pattern .enc] [--apply]
Ne regarde que les fichiers du dossier (pas les sous-dossiers) dont le nom se termine par --pattern. La date vient du nom (AAAA-MM-JJ) ou, à défaut, de la date de modification.
Sans --apply : simulation. Avec --apply : les fichiers hors politique sont SUPPRIMÉS définitivement.`, args, 1)
  if (args.apply && !args.pattern) fail('--apply exige --pattern (ex. --pattern .enc) : sans motif, tous les fichiers du dossier seraient concernés.')
  for (const k of ['daily', 'weekly', 'monthly']) if (args[k] !== undefined && !(Number.isInteger(Number(args[k])) && Number(args[k]) >= (k === 'daily' ? 1 : 0))) fail(`--${k} doit être un entier ${k === 'daily' ? '≥ 1 (au moins une sauvegarde récente est toujours gardée)' : '≥ 0'}.`)
  let files
  try {
    files = readdirSync(args._[0], { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(args.pattern ?? '')).map((e) => ({ name: e.name, date: backupDate(e.name, statSync(join(args._[0], e.name)).mtime) }))
  } catch (e) { fail(e.message) }
  const r = plan(files, { daily: Number(args.daily ?? 7), weekly: Number(args.weekly ?? 4), monthly: Number(args.monthly ?? 6) })
  r.keep.forEach((f) => console.log(`= garde     ${f.name}  (${f.why.join(', ')})`))
  r.remove.forEach((f) => console.log(`- ${args.apply ? 'supprime ' : 'supprimerait'} ${f.name}`))
  if (args.apply) for (const f of r.remove) unlinkSync(join(args._[0], f.name))
  console.log(`\n${files.length} fichier(s) : ${r.keep.length} conservé(s), ${r.remove.length} ${args.apply ? 'supprimé(s)' : 'à supprimer (simulation, ajoutez --apply)'}.`)
}
