import { BoxElement, Frame, type Element } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { LayerOrder } from "./LayerOrder.js";

/** 순서 계산만 검증하기 위해 위치가 같고 z만 다른 요소를 만든다. */
function createElements(zIndexes: readonly number[]): readonly Element[] {
  return zIndexes.map((z, index) => new BoxElement(
    `e${index}`, new Frame(0, 0, 10, 10), z, false,
  ));
}

describe("LayerOrder", () => {
  const order = new LayerOrder();

  it("선택 요소를 가장 위로 올리고 z를 촘촘하게 다시 매긴다", () => {
    const elements = createElements([0, 1, 2]);

    const changes = order.toFront(elements, ["e0"]);

    expect(changes.get("e0")).toBe(2);
    expect(changes.get("e1")).toBe(0);
    expect(changes.get("e2")).toBe(1);
  });

  it("선택 요소를 가장 아래로 내린다", () => {
    const elements = createElements([0, 1, 2]);

    const changes = order.toBack(elements, ["e2"]);

    expect(changes.get("e2")).toBe(0);
    expect(changes.get("e0")).toBe(1);
  });

  it("한 칸 앞으로는 바로 위 요소와만 자리를 바꾼다", () => {
    const elements = createElements([0, 1, 2]);

    const changes = order.forward(elements, ["e0"]);

    expect(changes.get("e0")).toBe(1);
    expect(changes.get("e1")).toBe(0);
    expect(changes.has("e2")).toBe(false);
  });

  it("한 칸 뒤로는 바로 아래 요소와만 자리를 바꾼다", () => {
    const elements = createElements([0, 1, 2]);

    const changes = order.backward(elements, ["e2"]);

    expect(changes.get("e2")).toBe(1);
    expect(changes.get("e1")).toBe(2);
  });

  it("z 값이 벌어져 있어도 순서 변경이 동작한다", () => {
    const elements = createElements([0, 50, 900]);

    const changes = order.forward(elements, ["e0"]);

    expect(changes.get("e0")).toBe(1);
    expect(changes.get("e1")).toBe(0);
  });

  it("z 값이 같아도 한 칸 이동이 실제로 순서를 바꾼다", () => {
    const elements = createElements([3, 3, 3]);

    const changes = order.toFront(elements, ["e0"]);

    expect(changes.get("e0")).toBe(2);
  });

  it("맨 위 요소를 더 올리려 해도 순서가 흐트러지지 않는다", () => {
    const elements = createElements([0, 1, 2]);

    const changes = order.forward(elements, ["e2"]);

    expect(changes.size).toBe(0);
  });

  it("여러 요소를 함께 올릴 때 서로의 상대 순서를 유지한다", () => {
    const elements = createElements([0, 1, 2, 3]);

    const changes = order.toFront(elements, ["e0", "e1"]);

    expect(changes.get("e0")).toBe(2);
    expect(changes.get("e1")).toBe(3);
  });
});
