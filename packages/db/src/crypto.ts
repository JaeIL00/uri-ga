import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCRYPTION_PREFIX = "v1";

function resolveKey(secret = process.env.MEMO_ENCRYPTION_KEY): Buffer {
  if (!secret) {
    throw new Error("MEMO_ENCRYPTION_KEY is required for memo encryption.");
  }

  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptMemo(plainText: string, secret?: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, resolveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url")
  ].join(":");
}

export function decryptMemo(payload: string, secret?: string): string {
  const [version, ivBase64, dataBase64, tagBase64] = payload.split(":");

  if (version !== ENCRYPTION_PREFIX || !ivBase64 || !dataBase64 || !tagBase64) {
    throw new Error("Invalid memo payload format.");
  }

  const decipher = createDecipheriv(ALGORITHM, resolveKey(secret), Buffer.from(ivBase64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataBase64, "base64url")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

export function encryptMemoIfPresent(value: string | null | undefined, secret?: string): string | null {
  if (!value) {
    return null;
  }

  return encryptMemo(value, secret);
}

export function decryptMemoIfPresent(value: string | null | undefined, secret?: string): string | null {
  if (!value) {
    return null;
  }

  return decryptMemo(value, secret);
}
