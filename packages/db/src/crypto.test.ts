import { describe, expect, it } from "vitest";
import { decryptMemo, encryptMemo } from "./crypto";

describe("memo encryption", () => {
  const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("round-trips plain text", () => {
    const encrypted = encryptMemo("School lunch and fruit", secret);

    expect(encrypted).not.toBe("School lunch and fruit");
    expect(decryptMemo(encrypted, secret)).toBe("School lunch and fruit");
  });

  it("rejects tampered payloads", () => {
    const encrypted = encryptMemo("Utility autopay", secret);
    const tampered = encrypted.replace("v1:", "v2:");

    expect(() => decryptMemo(tampered, secret)).toThrow("Invalid memo payload format.");
  });
});
