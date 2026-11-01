// Artwork and cries are hot-linked from the PokeAPI open-data repos (not bundled).
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const CRIES = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon'

export const sprite = {
  /** 96px pixel sprite: lists, scatter tooltips */
  small: (id: number) => `${SPRITES}/${id}.png`,
  /** large official artwork: cards, hero */
  art: (id: number) => `${SPRITES}/other/official-artwork/${id}.png`,
  /** animated battle sprite: arena stage */
  animated: (id: number) => `${SPRITES}/other/showdown/${id}.gif`,
}

export const cry = (id: number) => `${CRIES}/latest/${id}.ogg`
const legacyCry = (id: number) => `${CRIES}/legacy/${id}.ogg`

/** Play a cry; resolves when it ends (or fails), so cries can be sequenced. */
export function playCry(id: number, volume = 0.35): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(cry(id))
    audio.volume = volume
    let triedLegacy = false
    audio.onended = () => resolve()
    audio.onerror = () => {
      if (triedLegacy) return resolve()
      triedLegacy = true
      audio.src = legacyCry(id)
      audio.play().catch(() => resolve())
    }
    audio.play().catch(() => resolve())
    setTimeout(resolve, 4000) // never block the fight on audio
  })
}

/** <img onError> helper: walk a fallback chain of URLs. */
export function fallbackChain(...urls: string[]) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const i = Number(img.dataset.fallback ?? 0)
    if (i < urls.length) {
      img.dataset.fallback = String(i + 1)
      img.src = urls[i]
    }
  }
}
