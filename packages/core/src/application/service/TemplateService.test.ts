import { describe, expect, it, vi } from "vitest";
import type { TemplateStore } from "../port/TemplateStore";
import { TextElement } from "../../domain/element/TextElement";
import { Template } from "../../domain/template/Template";
import { TemplateValidator } from "../../domain/template/TemplateValidator";
import { Frame } from "../../domain/value/Frame";
import { PageSpec } from "../../domain/value/PageSpec";
import { TextStyle } from "../../domain/value/TextStyle";
import { TemplateService } from "./TemplateService";

describe("TemplateService", () => {
  it("초안은 검증하지 않고 저장소에 그대로 저장한다", async () => {
    const template = createTemplate(false);
    const { store, save } = createStore(template);
    const service = new TemplateService(store, new TemplateValidator());

    await service.save(template);

    expect(save).toHaveBeenCalledExactlyOnceWith(template);
  });

  it("검증에 실패하면 저장소의 발행 기능을 호출하지 않는다", async () => {
    const { store, publish } = createStore(createTemplate(false));
    const service = new TemplateService(store, new TemplateValidator());

    await expect(service.publish("payslip", 1)).rejects.toThrow("요소가 하나도 없다");
    expect(publish).not.toHaveBeenCalled();
  });

  it("검증을 통과하면 정확한 템플릿 버전을 발행한다", async () => {
    const { store, publish } = createStore(createTemplate(true));
    const service = new TemplateService(store, new TemplateValidator());

    await service.publish("payslip", 1);

    expect(publish).toHaveBeenCalledExactlyOnceWith("payslip", 1);
  });
});

/** 테스트가 저장 기술 없이 서비스의 호출 여부만 관찰할 수 있게 한다. */
function createStore(template: Template): {
  store: TemplateStore;
  save: ReturnType<typeof vi.fn>;
  publish: ReturnType<typeof vi.fn>;
} {
  const save = vi.fn(async (): Promise<void> => undefined);
  const publish = vi.fn(async (): Promise<void> => undefined);
  return {
    store: {
      get: vi.fn(async () => template),
      save,
      publish,
      listVersions: vi.fn(async () => []),
    },
    save,
    publish,
  };
}

/** 요소 유무만 바꿔 템플릿 검증 성공과 실패 조건을 분리한다. */
function createTemplate(withElement: boolean): Template {
  const element = new TextElement(
    "title",
    new Frame(10, 10, 50, 10),
    0,
    false,
    { kind: "literal", value: "급여명세서" },
    new TextStyle("Pretendard", 10),
  );
  return new Template({
    id: "payslip",
    name: "급여명세서",
    version: 1,
    status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"],
    elements: withElement ? [element] : [],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}
