import { describe, expect, it } from "vitest";
import { SignatureStrokes } from "./SignatureStrokes.js";

describe("SignatureStrokes", () => {
  it("처음에는 아무것도 그리지 않은 상태다", () => {
    expect(new SignatureStrokes().isEmpty()).toBe(true);
  });

  it("한 번 긋고 떼면 획 하나가 남는다", () => {
    const strokes = new SignatureStrokes();

    strokes.begin([0, 0]);
    strokes.extend([1, 1]);
    strokes.end();

    expect(strokes.getStrokes()).toEqual([{ points: [[0, 0], [1, 1]] }]);
  });

  it("두 번 그으면 획도 둘이다", () => {
    const strokes = new SignatureStrokes();

    strokes.begin([0, 0]);
    strokes.end();
    strokes.begin([5, 5]);
    strokes.end();

    expect(strokes.getStrokes()).toHaveLength(2);
  });

  it("긋는 중인 획도 화면에 그릴 수 있게 내어 준다", () => {
    const strokes = new SignatureStrokes();

    strokes.begin([0, 0]);
    strokes.extend([2, 2]);

    expect(strokes.current()).toEqual([[0, 0], [2, 2]]);
  });

  it("떼고 나면 긋는 중인 획은 없다", () => {
    const strokes = new SignatureStrokes();
    strokes.begin([0, 0]);

    strokes.end();

    expect(strokes.current()).toEqual([]);
  });

  it("긋기 시작하지 않았는데 들어온 점은 버린다", () => {
    const strokes = new SignatureStrokes();

    strokes.extend([1, 1]);

    expect(strokes.isEmpty()).toBe(true);
  });

  it("필압을 함께 남긴다", () => {
    const strokes = new SignatureStrokes();

    strokes.begin([0, 0, 0.4]);
    strokes.end();

    expect(strokes.getStrokes()[0]?.points[0]).toEqual([0, 0, 0.4]);
  });

  it("같은 자리에서 떼기만 한 점 하나도 획으로 남긴다", () => {
    const strokes = new SignatureStrokes();

    strokes.begin([3, 3]);
    strokes.end();

    expect(strokes.getStrokes()).toEqual([{ points: [[3, 3]] }]);
  });

  it("지우면 처음 상태로 돌아온다", () => {
    const strokes = new SignatureStrokes();
    strokes.begin([0, 0]);
    strokes.end();

    strokes.clear();

    expect(strokes.isEmpty()).toBe(true);
    expect(strokes.getStrokes()).toEqual([]);
  });

  it("내어 준 획을 밖에서 고쳐도 안쪽은 그대로다", () => {
    const strokes = new SignatureStrokes();
    strokes.begin([0, 0]);
    strokes.end();

    (strokes.getStrokes() as { points: unknown[] }[])[0]?.points.push([9, 9]);

    expect(strokes.getStrokes()[0]?.points).toHaveLength(1);
  });
});
