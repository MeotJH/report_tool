import { describe, expect, it } from "vitest";
import { ViewportState } from "./ViewportState.js";

describe("ViewportState", () => {
  it("기본 확대율은 실제 인쇄 크기와 같다", () => {
    expect(new ViewportState().getZoomPercent()).toBe(100);
  });

  it("확대와 축소가 사람이 예상하는 단계를 밟는다", () => {
    const viewport = new ViewportState();

    viewport.zoomIn();
    expect(viewport.getZoomPercent()).toBe(125);

    viewport.zoomOut();
    viewport.zoomOut();
    expect(viewport.getZoomPercent()).toBe(75);
  });

  it("지원 범위를 벗어나는 확대율은 경계로 제한한다", () => {
    const viewport = new ViewportState();

    viewport.setZoom(99);
    expect(viewport.getZoomPercent()).toBe(400);

    viewport.setZoom(0.001);
    expect(viewport.getZoomPercent()).toBe(20);
  });

  it("최대·최소에서 더 밟아도 넘어가지 않는다", () => {
    const viewport = new ViewportState();

    for (let step = 0; step < 20; step += 1) viewport.zoomIn();
    expect(viewport.getZoomPercent()).toBe(400);

    for (let step = 0; step < 20; step += 1) viewport.zoomOut();
    expect(viewport.getZoomPercent()).toBe(20);
  });

  it("화면 맞춤은 문서 전체가 들어가는 확대율을 고른다", () => {
    const viewport = new ViewportState();

    viewport.fit(794, 1123, 900, 700, 40);

    expect(viewport.getZoom()).toBeLessThan(1);
    expect(1123 * viewport.getZoom()).toBeLessThanOrEqual(700 - 80 + 0.001);
  });

  it("실제 크기 복귀는 확대율을 100%로 되돌린다", () => {
    const viewport = new ViewportState();
    viewport.setZoom(2.5);

    viewport.resetZoom();

    expect(viewport.getZoomPercent()).toBe(100);
  });
});
