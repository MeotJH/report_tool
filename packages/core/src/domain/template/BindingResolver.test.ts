import { describe, expect, it } from "vitest";
import { Binding } from "../value/Binding";
import { BindingResolver } from "./BindingResolver";

const resolver = new BindingResolver();

describe("BindingResolver", () => {
  it("찾은 값에 지정한 포맷을 적용한다", () => {
    const binding = new Binding("pay.net", {
      formatSpec: { kind: "currency", currency: "KRW" },
    });

    const result = resolver.resolve(binding, { pay: { net: 3_800_000 } });

    expect(result).toBe("3,800,000원");
  });

  it("선택 데이터가 없으면 대체 문자열을 반환한다", () => {
    const binding = new Binding("employee.department", { fallback: "-" });

    expect(resolver.resolve(binding, {})).toBe("-");
  });

  it("필수 데이터가 없으면 경로를 포함한 예외를 던진다", () => {
    const binding = new Binding("employee.name", { required: true });

    expect(() => resolver.resolve(binding, {})).toThrow(
      "필수 필드 employee.name가 데이터에 없다",
    );
  });
});
