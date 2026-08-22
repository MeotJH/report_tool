import { describe, expect, it } from "vitest";
import { CurrencyFormatter } from "./CurrencyFormatter";
import { DateFormatter } from "./DateFormatter";
import { FormatterRegistry } from "./FormatterRegistry";
import { MaskFormatter } from "./MaskFormatter";
import { NumberFormatter } from "./NumberFormatter";
import { PlainTextFormatter } from "./PlainTextFormatter";
import { PercentFormatter } from "./PercentFormatter";

describe("FormatterRegistry", () => {
  it("설정이 없으면 일반 문자열 포맷터를 만든다", () => {
    expect(FormatterRegistry.create(null)).toBeInstanceOf(PlainTextFormatter);
  });

  it("text 설정으로 일반 문자열 포맷터를 만든다", () => {
    expect(FormatterRegistry.create({ kind: "text" })).toBeInstanceOf(
      PlainTextFormatter,
    );
  });

  it("currency 설정으로 통화 포맷터를 만든다", () => {
    const formatter = FormatterRegistry.create({
      kind: "currency",
      currency: "KRW",
    });

    expect(formatter).toBeInstanceOf(CurrencyFormatter);
  });

  it("number 설정으로 숫자 포맷터를 만든다", () => {
    expect(FormatterRegistry.create({ kind: "number" })).toBeInstanceOf(
      NumberFormatter,
    );
  });

  it("date 설정으로 날짜 포맷터를 만든다", () => {
    const formatter = FormatterRegistry.create({
      kind: "date",
      pattern: "YYYY-MM-DD",
    });

    expect(formatter).toBeInstanceOf(DateFormatter);
  });

  it("mask 설정으로 마스킹 포맷터를 만든다", () => {
    expect(FormatterRegistry.create({ kind: "mask" })).toBeInstanceOf(
      MaskFormatter,
    );
  });

  it("percent 설정으로 퍼센트 포맷터를 만든다", () => {
    expect(FormatterRegistry.create({ kind: "percent" })).toBeInstanceOf(
      PercentFormatter,
    );
  });
});
