import { describe, expect, it } from "vitest";
import { ContentText } from "./ContentText.js";

const DATA = { customer: { shortName: "인팩" }, period: { month: "2026년 07월" } };

describe("ContentText.source (설계 화면)", () => {
  it("데이터 문구를 채우지 않고 써 넣은 대로 보여 준다", () => {
    const text = ContentText.source()
      .textOf({ kind: "template", value: "-{{customer.shortName}}-" }, DATA);

    expect(text).toBe("-{{customer.shortName}}-");
  });

  it("고정 문구도 그대로 보여 준다", () => {
    const text = ContentText.source()
      .textOf({ kind: "literal", value: "Customer Report" }, DATA);

    expect(text).toBe("Customer Report");
  });

  it("샘플 데이터를 주지 않아도 같은 것을 보여 준다", () => {
    const withData = ContentText.source()
      .textOf({ kind: "template", value: "{{period.month}}" }, DATA);
    const withoutData = ContentText.source()
      .textOf({ kind: "template", value: "{{period.month}}" }, {});

    expect(withData).toBe(withoutData);
  });
});

describe("ContentText.resolved (미리보기·발행)", () => {
  it("데이터 문구를 실제 값으로 채운다", () => {
    const text = ContentText.resolved()
      .textOf({ kind: "template", value: "-{{customer.shortName}}-" }, DATA);

    expect(text).toBe("-인팩-");
  });

  it("고정 문구는 치환하지 않는다", () => {
    const text = ContentText.resolved()
      .textOf({ kind: "literal", value: "-{{customer.shortName}}-" }, DATA);

    expect(text).toBe("-{{customer.shortName}}-");
  });
});
