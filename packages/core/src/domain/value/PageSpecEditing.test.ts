import { describe, expect, it } from "vitest";
import { PageSpec } from "./PageSpec";

describe("페이지 설정 편집", () => {
  const page = new PageSpec("A4", "portrait", [10, 10, 10, 10]);

  it("현재 용지·방향·여백을 편집기에 읽을 수 있게 제공한다", () => {
    expect(page.sizeName()).toBe("A4");
    expect(page.orientationName()).toBe("portrait");
    expect(page.marginMm()).toEqual([10, 10, 10, 10]);
  });

  it("반환한 여백 배열을 바꿔도 원본 페이지 설정이 변하지 않는다", () => {
    // 읽기 전용 타입을 일부러 벗긴다. 이 테스트가 지키려는 것은 타입이 아니라
    // **런타임에 실제로 복사본을 주는가**이다. 호스트는 JS로도 부를 수 있다.
    const margin = page.marginMm() as unknown as number[];
    margin[0] = 99;

    expect(page.marginMm()).toEqual([10, 10, 10, 10]);
  });

  it("용지 규격만 바꾸고 방향과 여백을 유지한다", () => {
    const changed = page.withSize("A5");

    expect(changed.widthMm()).toBe(148);
    expect(changed.orientationName()).toBe("portrait");
    expect(changed.marginMm()).toEqual([10, 10, 10, 10]);
  });

  it("방향만 바꾸면 너비와 높이가 서로 바뀐다", () => {
    const changed = page.withOrientation("landscape");

    expect(changed.widthMm()).toBe(297);
    expect(changed.heightMm()).toBe(210);
    expect(changed.sizeName()).toBe("A4");
  });

  it("여백만 바꿔도 배치 가능한 영역이 함께 갱신된다", () => {
    const changed = page.withMargin([20, 15, 20, 15]);

    expect(changed.contentFrame().x).toBe(15);
    expect(changed.contentFrame().width).toBe(180);
    expect(changed.contentFrame().height).toBe(257);
  });

  it("배치 영역이 남지 않는 여백을 거부한다", () => {
    expect(() => page.withMargin([200, 0, 200, 0]))
      .toThrow("여백이 너무 커서 배치할 수 있는 영역이 남지 않는다");
  });
});
