import { describe, expect, it } from "vitest";
import type { FormatSpec } from "../format/FormatSpec";
import { Binding } from "./Binding";

describe("Binding", () => {
  it("기본 옵션으로 데이터 경로를 구성한다", () => {
    const binding = new Binding("employee.name");

    expect(binding.path.resolve({ employee: { name: "김정환" } })).toBe("김정환");
    expect(binding.formatSpec).toBeNull();
    expect(binding.fallback).toBeNull();
    expect(binding.required).toBe(false);
  });

  it("지정한 포맷과 대체 문자열을 보관한다", () => {
    const formatSpec: FormatSpec = {
      kind: "currency",
      currency: "KRW",
      showSymbol: true,
    };

    const binding = new Binding("pay.net", {
      formatSpec,
      fallback: "0원",
    });

    expect(binding.formatSpec).toEqual(formatSpec);
    expect(binding.fallback).toBe("0원");
  });

  it("필수 데이터 여부를 설정한다", () => {
    const binding = new Binding("employee.id", { required: true });

    expect(binding.required).toBe(true);
  });
});
