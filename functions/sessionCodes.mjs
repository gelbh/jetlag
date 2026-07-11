const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateSessionCode() {
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }

  return code;
}
