import { Frame } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { ResizeHandleSet } from "./ResizeHandleSet.js";

const frame = new Frame(20, 30, 40, 20);

describe("ResizeHandleSet", () => {
  const handles = new ResizeHandleSet();

  it("여덟 방향 손잡이를 요소 둘레에 배치한다", () => {
    const views = handles.views(frame);

    expect(views).toHaveLength(8);
    expect(views.find((view) => view.position === "nw")).toMatchObject({ xMm: 20, yMm: 30 });
    expect(views.find((view) => view.position === "se")).toMatchObject({ xMm: 60, yMm: 50 });
    expect(views.find((view) => view.position === "n")).toMatchObject({ xMm: 40, yMm: 30 });
  });

  it("판정 반경 안의 손잡이만 잡는다", () => {
    expect(handles.findAt(frame, 60.5, 50.5, 2)?.position).toBe("se");
    expect(handles.findAt(frame, 40, 40, 2)).toBeUndefined();
  });

  it("오른쪽 아래 손잡이는 시작 좌표를 고정하고 크기만 늘린다", () => {
    const handle = handles.findAt(frame, 60, 50, 1)!;

    const resized = handle.resize(frame, 10, 5);

    expect(resized).toEqual(new Frame(20, 30, 50, 25));
  });

  it("왼쪽 위 손잡이는 시작 좌표와 크기를 함께 바꾼다", () => {
    const handle = handles.findAt(frame, 20, 30, 1)!;

    const resized = handle.resize(frame, 5, 5);

    expect(resized).toEqual(new Frame(25, 35, 35, 15));
  });

  it("가운데 손잡이는 한 축만 바꾸고 나머지 축을 유지한다", () => {
    const handle = handles.findAt(frame, 40, 50, 1)!;

    const resized = handle.resize(frame, 12, 6);

    expect(resized).toEqual(new Frame(20, 30, 40, 26));
  });

  it("최소 크기 아래로는 줄어들지 않는다", () => {
    const handle = handles.findAt(frame, 60, 50, 1)!;

    const resized = handle.resize(frame, -100, -100);

    expect(resized.width).toBe(2);
    expect(resized.height).toBe(2);
    expect(resized.x).toBe(20);
  });

  it("반대 방향으로 지나치게 끌어도 잡은 변이 고정 변을 넘지 않는다", () => {
    const handle = handles.findAt(frame, 20, 30, 1)!;

    const resized = handle.resize(frame, 100, 100);

    expect(resized.x + resized.width).toBe(60);
    expect(resized.y + resized.height).toBe(50);
    expect(resized.width).toBe(2);
  });
});
