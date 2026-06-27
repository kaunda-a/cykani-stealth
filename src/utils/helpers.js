// Utility helpers

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}
