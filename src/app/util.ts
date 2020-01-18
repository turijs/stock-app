export function randomInRange(lower: number, upper: number) {
  const range = upper - lower + 1;
  return Math.floor(Math.random() * range) + lower;
}

export function randomFloatInRange(lower: number, upper: number) {
  const range = upper - lower;
  return Math.random() * range + lower;
}

export function round(n: number, fractionalDigits = 3) {
  return Math.round(n * 10**fractionalDigits) / 10**fractionalDigits;
}
