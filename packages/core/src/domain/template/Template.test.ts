import { describe, expect, it } from "vitest";
import { TextElement } from "../element/TextElement";
import { Frame } from "../value/Frame";
import { PageSpec } from "../value/PageSpec";
import { TextStyle } from "../value/TextStyle";
import { Template } from "./Template";

const page = new PageSpec("A4", "portrait", [15, 15, 15, 15]);
const style = new TextStyle("Pretendard", 10);

describe("Template", () => {
  it("호출자가 내부 요소 목록을 변경하지 못하도록 매번 복사본을 반환한다", () => {
    const template = createTemplate().addElement(createTextElement("title"));

    const firstRead = template.getElements();
    const secondRead = template.getElements();

    expect(firstRead).toEqual(secondRead);
    expect(firstRead).not.toBe(secondRead);
  });

  it("초안에 요소를 추가해도 원본 템플릿을 변경하지 않는다", () => {
    const original = createTemplate();
    const element = createTextElement("title");

    const changed = original.addElement(element);

    expect(changed.getElements()).toEqual([element]);
    expect(original.getElements()).toEqual([]);
  });

  it("발행된 템플릿에는 요소를 추가하지 못한다", () => {
    const published = createTemplate().publish();

    expect(() => published.addElement(createTextElement("title"))).toThrow(
      "발행된 템플릿은 수정할 수 없다. createNextVersion()으로 새 버전을 만들어라",
    );
  });

  it("초안을 발행 상태의 새 템플릿으로 변경한다", () => {
    const draft = createTemplate();

    const published = draft.publish();

    expect(published.status).toBe("published");
    expect(draft.status).toBe("draft");
  });

  it("다음 버전은 요소를 유지한 새로운 초안이다", () => {
    const published = createTemplate()
      .addElement(createTextElement("title"))
      .publish();

    const next = published.createNextVersion();

    expect(next.version).toBe(2);
    expect(next.status).toBe("draft");
    expect(next.getElements()).toEqual(published.getElements());
  });

  it("요소를 제거한 새 템플릿을 반환한다", () => {
    const original = createTemplate().addElement(createTextElement("title"));

    const changed = original.removeElement("title");

    expect(changed.getElements()).toEqual([]);
    expect(original.getElements()).toHaveLength(1);
  });

  it("요소를 교체한 새 템플릿을 반환한다", () => {
    const original = createTemplate().addElement(createTextElement("title"));
    const nextFrame = new Frame(50, 60, 70, 20);

    const changed = original.replaceElement("title", (element) => (
      element.withFrame(nextFrame)
    ));

    expect(changed.getElements()[0]?.frame.equals(nextFrame)).toBe(true);
    expect(original.getElements()[0]?.frame.equals(nextFrame)).toBe(false);
  });

  it("존재하지 않는 요소는 교체하지 않는다", () => {
    const template = createTemplate();

    expect(() => template.replaceElement("missing", (element) => element)).toThrow(
      "요소 missing을 찾을 수 없다",
    );
  });

  it("템플릿의 이름을 바꾼 후 새 템플릿을 반환한다", () => {
    const original = createTemplate();

    const changed = original.rename("급여명세서 v2");

    expect(changed.name).toBe("급여명세서 v2");
    expect(original.name).toBe("급여명세서");
  });

  it("발행된 템플릿의 이름을 변경하지 못한다", () => {
    const published = createTemplate().publish();

    expect(() => published.rename("변경된 이름")).toThrow(
      "발행된 템플릿은 수정할 수 없다. createNextVersion()으로 새 버전을 만들어라",
    );
  });
});

/** 테스트마다 독립적인 초안 템플릿을 사용해 상태 변경의 영향을 격리한다. */
function createTemplate(): Template {
  return new Template({
    id: "payslip",
    name: "급여명세서",
    version: 1,
    status: "draft",
    page,
    fonts: ["Pretendard"],
    elements: [],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 테스트 의도가 요소 생성 세부사항에 가려지지 않도록 최소 텍스트 요소를 만든다. */
function createTextElement(id: string): TextElement {
  return new TextElement(
    id,
    new Frame(10, 10, 50, 10),
    0,
    false,
    { kind: "literal", value: "급여명세서" },
    style,
  );
}

describe("Template 편집 가능 여부", () => {
  it("초안은 편집할 수 있다", () => {
    expect(draft().isEditable()).toBe(true);
  });

  it("발행본은 편집할 수 없다", () => {
    // 화면이 `status === "draft"`를 직접 비교하면 상태가 하나 늘 때마다
    // 비교하는 자리를 전부 찾아야 한다. 판단은 문서 자신이 한다.
    expect(draft().publish().isEditable()).toBe(false);
  });

  it("다음 버전을 시작하면 다시 편집할 수 있다", () => {
    const next = draft().publish().createNextVersion();

    expect(next.isEditable()).toBe(true);
    expect(next.version).toBe(2);
  });
});

/** 편집 가능 여부 시험에 쓸 빈 초안이다. */
function draft(): Template {
  return new Template({
    id: "t", name: "시험", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements: [],
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  });
}
