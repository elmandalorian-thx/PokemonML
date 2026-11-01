import raw from '../data/guide.json'
import type { Guide, Pokemon } from './types'

export const guide = raw as unknown as Guide

export const pokemonById = new Map<number, Pokemon>(guide.pokemon.map((p) => [p.id, p]))
export const getPokemon = (id: number) => pokemonById.get(id)!
export const byName = (name: string) => guide.pokemon.find((p) => p.name === name)!

export const STAT_NAMES = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed']
export const STAT_SHORT = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']
/** Average of each stat over all Pokémon (the outline in every radar). */
export const STAT_MEANS = STAT_NAMES.map((_, i) => guide.pokemon.reduce((s, p) => s + p.stats[i], 0) / guide.pokemon.length)

/** Head-to-head records ("lo-hi" -> [wins by lo, wins by hi]), fetched once on demand. */
let battles: Promise<Record<string, [number, number]>> | null = null
export function loadBattles() {
  battles ??= fetch(`${import.meta.env.BASE_URL}data/battles.json`).then((r) => r.json())
  return battles
}

export async function headToHead(a: number, b: number) {
  const all = await loadBattles()
  const [lo, hi] = a < b ? [a, b] : [b, a]
  const rec = all[`${lo}-${hi}`]
  if (!rec) return null
  const winsA = a === lo ? rec[0] : rec[1]
  return { meetings: rec[0] + rec[1], winsA, winsB: rec[0] + rec[1] - winsA }
}

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`
export const fmt = (x: number) => x.toLocaleString('en-US')
