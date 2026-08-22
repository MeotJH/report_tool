import { describe, expect, it } from "vitest";
import { DataPath } from "./DataPath";

describe("DataPath", () => {
  it("점 표기 경로를 따라 중첩된 값을 찾는다", () => {
    const path = new DataPath("a.b.c");

    expect(path.resolve({ a: { b: { c: 5 } } })).toBe(5);
  });

  it("중간 경로가 없으면 undefined를 반환한다", () => {
    const path = new DataPath("a.x.c");

    expect(path.resolve({ a: { b: { c: 5 } } })).toBeUndefined();
  });

  it("조회 대상이 null이면 undefined를 반환한다", () => {
    expect(new DataPath("a.b.c").resolve(null)).toBeUndefined();
  });

  it("중간 값이 객체가 아니면 안전하게 조회를 중단한다", () => {
    expect(new DataPath("a.b.c").resolve({ a: { b: 3 } })).toBeUndefined();
  });

  it("빈 경로를 허용하지 않는다", () => {
    expect(() => new DataPath("")).toThrow("데이터 경로는 비어 있을 수 없다");
  });
});
