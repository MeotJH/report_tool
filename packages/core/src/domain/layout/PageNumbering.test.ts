import { describe, expect, it } from "vitest";
import { PageNumbering } from "./PageNumbering.js";

describe("PageNumbering", () => {
  it("현재 쪽과 전체 쪽 수를 채운다", () => {
    const numbering = new PageNumbering(3, 10);

    expect(numbering.apply("{{page}} / {{pages}}")).toBe("3 / 10");
  });

  it("자릿수를 지정하면 앞을 0으로 채운다", () => {
    const numbering = new PageNumbering(1, 10);

    expect(numbering.apply("{{page:00}} / {{pages:00}}")).toBe("01 / 10");
  });

  it("지정한 자릿수보다 큰 수는 자르지 않는다", () => {
    const numbering = new PageNumbering(100, 100);

    expect(numbering.apply("{{page:00}}")).toBe("100");
  });

  it("쪽 토큰이 없는 문구는 그대로 둔다", () => {
    const numbering = new PageNumbering(1, 1);

    expect(numbering.apply("처리내역 (계)")).toBe("처리내역 (계)");
  });

  it("데이터 경로는 건드리지 않는다", () => {
    const numbering = new PageNumbering(2, 5);

    expect(numbering.apply("{{employee.name}} · {{page}}")).toBe("{{employee.name}} · 2");
  });

  it("한 문구에 여러 번 나와도 모두 채운다", () => {
    const numbering = new PageNumbering(2, 5);

    expect(numbering.apply("{{page}}쪽 (총 {{pages}}쪽 중 {{page}}번째)"))
      .toBe("2쪽 (총 5쪽 중 2번째)");
  });

  it("공백을 넣어 적어도 알아본다", () => {
    const numbering = new PageNumbering(2, 5);

    expect(numbering.apply("{{ page }} / {{ pages }}")).toBe("2 / 5");
  });
});
