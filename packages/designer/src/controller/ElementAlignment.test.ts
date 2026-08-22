import { BoxElement, Frame, type Element } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { ElementAlignment } from "./ElementAlignment.js";

/** 정렬 결과만 검증하도록 위치와 크기가 다른 요소를 만든다. */
function createElement(id: string, frame: Frame): Element {
  return new BoxElement(id, frame, 0, false);
}

describe("ElementAlignment", () => {
  const alignment = new ElementAlignment();
  const reference = new Frame(0, 0, 100, 100);

  it("왼쪽 정렬은 기준 영역의 왼쪽 변에 맞춘다", () => {
    const elements = [
      createElement("a", new Frame(10, 10, 20, 10)),
      createElement("b", new Frame(40, 30, 30, 10)),
    ];

    const changes = alignment.align(elements, "left", reference);

    expect(changes.get("a")?.x).toBe(0);
    expect(changes.get("b")?.x).toBe(0);
    expect(changes.get("b")?.y).toBe(30);
  });

  it("가운데 정렬은 요소 크기를 고려해 중심을 맞춘다", () => {
    const elements = [createElement("a", new Frame(10, 10, 20, 10))];

    const changes = alignment.align(elements, "horizontalCenter", reference);

    expect(changes.get("a")?.x).toBe(40);
  });

  it("아래 정렬은 기준 영역의 아래 변에 요소 끝을 맞춘다", () => {
    const elements = [createElement("a", new Frame(10, 10, 20, 10))];

    const changes = alignment.align(elements, "bottom", reference);

    expect(changes.get("a")?.y).toBe(90);
  });

  it("이미 정렬된 요소는 변경 목록에 넣지 않는다", () => {
    const elements = [createElement("a", new Frame(0, 10, 20, 10))];

    expect(alignment.align(elements, "left", reference).size).toBe(0);
  });

  it("하나만 선택하면 페이지 배치 영역을 기준으로 삼는다", () => {
    const pageContent = new Frame(10, 10, 190, 277);
    const elements = [createElement("a", new Frame(50, 50, 20, 10))];

    expect(alignment.referenceFrame(elements, pageContent)).toBe(pageContent);
  });

  it("여럿을 선택하면 선택 전체 경계를 기준으로 삼는다", () => {
    const elements = [
      createElement("a", new Frame(10, 10, 20, 10)),
      createElement("b", new Frame(50, 40, 20, 10)),
    ];

    expect(alignment.referenceFrame(elements, new Frame(0, 0, 1, 1)))
      .toEqual(new Frame(10, 10, 60, 40));
  });

  it("가로 분배는 양 끝을 고정하고 사이 간격을 같게 만든다", () => {
    const elements = [
      createElement("a", new Frame(0, 0, 10, 10)),
      createElement("b", new Frame(30, 0, 10, 10)),
      createElement("c", new Frame(80, 0, 10, 10)),
    ];

    const changes = alignment.distribute(elements, "horizontal");

    expect(changes.get("b")?.x).toBe(40);
    expect(changes.has("a")).toBe(false);
    expect(changes.has("c")).toBe(false);
  });

  it("두 개 이하는 분배할 것이 없다", () => {
    const elements = [
      createElement("a", new Frame(0, 0, 10, 10)),
      createElement("b", new Frame(30, 0, 10, 10)),
    ];

    expect(alignment.distribute(elements, "horizontal").size).toBe(0);
  });
});
