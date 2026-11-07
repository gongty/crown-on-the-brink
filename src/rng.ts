// 可种子化随机数。逻辑层所有随机都从这里来，用于每日种子与复现 bug。

export function hash32(s: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ (h2 >>> 3)) >>> 0;
}

export class Rng {
  private a: number;
  constructor(seed: number) { this.a = seed >>> 0 || 0x9e3779b9; }
  /** [0,1) mulberry32 */
  next(): number {
    let t = (this.a = (this.a + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number): number { return Math.floor(this.next() * n); }
  range(lo: number, hi: number): number { return lo + this.int(hi - lo + 1); }
  chance(p: number): boolean { return this.next() < p; }
  pick<T>(arr: readonly T[]): T { return arr[this.int(arr.length)]; }
  weighted<T>(items: readonly T[], w: (t: T) => number): T {
    let total = 0;
    for (const it of items) total += Math.max(0, w(it));
    if (total <= 0) return items[this.int(items.length)];
    let r = this.next() * total;
    for (const it of items) { r -= Math.max(0, w(it)); if (r < 0) return it; }
    return items[items.length - 1];
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) { const j = this.int(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
}

/** 从种子派生一条独立的随机流：同种子同 key 永远同结果，互不干扰。 */
export function stream(seed: string, ...keys: (string | number)[]): Rng {
  return new Rng(hash32(seed + '|' + keys.join('|')));
}

const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function randomSeedCode(r: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHA[Math.floor(r() * ALPHA.length)];
  return s.slice(0, 4) + '-' + s.slice(4);
}
export function dailySeed(d: Date = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `D${y}${m}${day}`;
}

export function forwardDraws(seed:number){let x=seed>>>0;if(!x)x=0x6d2b79f5;const out:number[]=[];for(let i=0;i<3;i++){x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;out.push(x%3);}return out;}
