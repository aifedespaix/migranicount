import type { Migraine } from '../types/migraine'
import { addMinutesToHHmm } from './date'

type Timed = Pick<Migraine, 'date' | 'heureDebut' | 'heureFin'>

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function startOf(m: Pick<Migraine, 'date' | 'heureDebut'>): Date {
  return new Date(`${m.date}T${m.heureDebut}:00`)
}

/** Crises sans heure de fin, de la plus récente à la plus ancienne. */
export function ongoingMigraines<T extends Timed>(migraines: T[]): T[] {
  return migraines
    .filter((m) => m.heureFin === null)
    .sort((a, b) => (a.date + a.heureDebut < b.date + b.heureDebut ? 1 : -1))
}

/** Minutes écoulées depuis le début de la crise (0 si le début est dans le futur). */
export function elapsedMinutes(m: Pick<Migraine, 'date' | 'heureDebut'>, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - startOf(m).getTime()) / 60000))
}

/**
 * Une crise ne stocke qu'une heure de fin (pas de date) : au-delà de 24 h,
 * « maintenant » ne peut plus représenter correctement la fin.
 */
export function startedOverADayAgo(m: Pick<Migraine, 'date' | 'heureDebut'>, now: Date = new Date()): boolean {
  return elapsedMinutes(m, now) >= 1440
}

export interface EndOption {
  label: string
  heure: string
}

/** Raccourcis de fin proposés : seuls ceux postérieurs au début de la crise sont gardés. */
export function quickEndOptions(m: Pick<Migraine, 'date' | 'heureDebut'>, now: Date = new Date()): EndOption[] {
  if (startedOverADayAgo(m, now)) return []
  const elapsed = elapsedMinutes(m, now)
  const nowHHmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const candidates = [
    { label: "À l'instant", ago: 0 },
    { label: 'Il y a 30 min', ago: 30 },
    { label: 'Il y a 1 h', ago: 60 },
    { label: 'Il y a 2 h', ago: 120 },
  ]
  return candidates
    .filter((c) => c.ago === 0 || c.ago < elapsed)
    .map((c) => ({ label: c.label, heure: addMinutesToHHmm(nowHHmm, -c.ago) }))
}

/** Durée d'une crise terminée, en minutes (une fin antérieure au début est comptée au lendemain). */
export function durationMinutes(heureDebut: string, heureFin: string): number {
  const [h1, m1] = heureDebut.split(':').map(Number)
  const [h2, m2] = heureFin.split(':').map(Number)
  const diff = h2 * 60 + m2 - (h1 * 60 + m1)
  return diff < 0 ? diff + 1440 : diff
}
