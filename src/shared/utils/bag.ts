/**
 * Tirage sans répétition : on vide le sac avant de le remplir à nouveau.
 * Le sac vit en RAM, un redémarrage le remélange.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createBag<T>(items: readonly T[]) {
  if (items.length === 0) throw new Error('createBag: liste vide');
  let remaining: T[] = [];
  return {
    draw(): T {
      if (remaining.length === 0) remaining = shuffle(items);
      return remaining.pop()!;
    },
  };
}
