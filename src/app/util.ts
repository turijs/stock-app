export function randomInRange(lower, upper) {
  const range = upper - lower + 1;
  return Math.floor(Math.random() * range) + lower;
}

export function randomFloatInRange(lower, upper) {
  const range = upper - lower;
  return Math.random() * range + lower;
}

export function round(n, fractionalDigits = 3) {
  return Math.round(n * 10**fractionalDigits) / 10**fractionalDigits;
}
