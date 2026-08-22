import { describe, expect, it } from "vitest";
import { SelectionModel } from "./SelectionModel.js";

describe("SelectionModel", () => {
  it("기본 선택은 기존 항목을 지우고 하나만 남긴다", () => {
    const selection = new SelectionModel();

    selection.select("a");
    selection.select("b");

    expect(selection.getSelectedIds()).toEqual(["b"]);
  });

  it("추가 선택과 전체 해제를 지원한다", () => {
    const selection = new SelectionModel();

    selection.select("a");
    selection.select("b", true);

    expect(selection.getSelectedIds()).toEqual(["a", "b"]);
    expect(selection.isSelected("a")).toBe(true);
    selection.clear();
    expect(selection.getSelectedIds()).toEqual([]);
  });
});
