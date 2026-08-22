import { Frame, PageSpec } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { SnapGuide, SnapTargets } from "./SnapGuide.js";

const page = new PageSpec("A4", "portrait", [10, 10, 10, 10]);

describe("SnapGuide", () => {
  it("임계값 안의 가장 가까운 세로·가로 기준선에 맞춘다", () => {
    const guide = new SnapGuide(2);
    const targets = SnapTargets.from([new Frame(20, 30, 10, 10)], page);

    const result = guide.snapMove(new Frame(21, 31, 10, 10), targets);

    expect(result.frame.equals(new Frame(20, 30, 10, 10))).toBe(true);
  });

  it("스냅이 걸린 기준선을 화면에 그릴 수 있게 함께 알려준다", () => {
    const guide = new SnapGuide(2);
    const targets = SnapTargets.from([new Frame(20, 30, 10, 10)], page);

    const result = guide.snapMove(new Frame(21, 31, 10, 10), targets);

    expect(result.lines).toEqual([
      { orientation: "vertical", positionMm: 20 },
      { orientation: "horizontal", positionMm: 30 },
    ]);
  });

  it("임계값 밖이면 원래 위치를 유지하고 기준선도 알리지 않는다", () => {
    const guide = new SnapGuide(2);
    const moving = new Frame(60, 80, 10, 10);

    const result = guide.snapMove(moving, SnapTargets.from([new Frame(20, 20, 5, 5)], page));

    expect(result.frame.equals(moving)).toBe(true);
    expect(result.lines).toEqual([]);
  });

  it("다른 요소가 없어도 페이지 여백선에 맞춘다", () => {
    const guide = new SnapGuide(2);

    const result = guide.snapMove(new Frame(11, 60, 20, 10), SnapTargets.from([], page));

    expect(result.frame.x).toBe(10);
  });

  it("페이지 가로 중심선에 맞춘다", () => {
    const guide = new SnapGuide(2);

    const result = guide.snapMove(new Frame(100, 60, 10, 10), SnapTargets.from([], page));

    expect(result.frame.x + result.frame.width / 2).toBe(105);
  });

  it("크기 변경에서는 손이 잡은 변만 움직여 반대쪽 변을 고정한다", () => {
    const guide = new SnapGuide(2);
    const targets = SnapTargets.from([new Frame(80, 30, 10, 10)], page);

    const result = guide.snapEdges(
      new Frame(20, 30, 59, 10),
      { left: false, top: false, right: true, bottom: false },
      targets,
    );

    expect(result.frame.x).toBe(20);
    expect(result.frame.x + result.frame.width).toBe(80);
  });

  it("잡지 않은 변은 기준선 후보에서 제외한다", () => {
    const guide = new SnapGuide(2);
    const targets = SnapTargets.from([new Frame(21, 30, 10, 10)], page);

    const result = guide.snapEdges(
      new Frame(20, 60, 30, 10),
      { left: false, top: false, right: true, bottom: false },
      targets,
    );

    expect(result.frame.x).toBe(20);
  });
});
