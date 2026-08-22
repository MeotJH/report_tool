import { describe, expect, it } from "vitest";
import { DocumentHash } from "./DocumentHash";

describe("DocumentHash", () => {
  it("64자의 소문자 SHA-256 hex 문자열을 보관한다", () => {
    const hex = "a".repeat(64);

    const hash = new DocumentHash(hex);

    expect(hash.toHex()).toBe(hex);
  });

  it.each([
    "a".repeat(63),
    "A".repeat(64),
    "z".repeat(64),
  ])("SHA-256 hex 형식이 아니면 생성하지 않는다", (hex) => {
    expect(() => new DocumentHash(hex)).toThrow("SHA-256 해시는 64자의 소문자 hex여야 한다");
  });

  it("같은 문자열을 가진 해시를 같은 값으로 비교한다", () => {
    const first = new DocumentHash("1".repeat(64));
    const second = new DocumentHash("1".repeat(64));

    expect(first.equals(second)).toBe(true);
  });
});
