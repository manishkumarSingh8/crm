import crypto from "crypto";


export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16);
  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
};

export const verifyPassword = async (password, stored) => {
  const [type, saltB64, hashB64] = (stored || "").split("$");
  if (type !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, expected.length, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return crypto.timingSafeEqual(actual, expected);
};