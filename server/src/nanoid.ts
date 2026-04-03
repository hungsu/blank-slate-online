const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function nanoid(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}
