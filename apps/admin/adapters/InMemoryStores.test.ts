import { IssuedDocument, DocumentHash, PageSpec, Template } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { InMemoryDocumentStore } from "./InMemoryDocumentStore.js";
import { InMemoryTemplateStore } from "./InMemoryTemplateStore.js";

describe("InMemoryTemplateStore", () => {
  it("넣은 것을 그대로 꺼낸다", async () => {
    const store = new InMemoryTemplateStore();
    const template = draft();

    await store.save(template);

    expect(await store.get("payslip")).toBe(template);
  });

  it("없는 템플릿을 찾으면 이유를 말한다", async () => {
    await expect(new InMemoryTemplateStore().get("없음"))
      .rejects.toThrow("템플릿을 찾을 수 없다: 없음");
  });

  it("버전을 지정하면 그 버전을 준다", async () => {
    const store = new InMemoryTemplateStore();
    await store.save(draft());
    await store.save(draft().createNextVersion());

    expect((await store.get("payslip", 1)).version).toBe(1);
  });

  it("버전을 지정하지 않으면 가장 높은 버전을 준다", async () => {
    const store = new InMemoryTemplateStore();
    await store.save(draft());
    await store.save(draft().createNextVersion());

    expect((await store.get("payslip")).version).toBe(2);
  });

  it("같은 버전을 다시 저장하면 덮어쓴다", async () => {
    const store = new InMemoryTemplateStore();
    await store.save(draft());

    await store.save(draft().rename("고친 이름"));

    expect((await store.get("payslip")).name).toBe("고친 이름");
    expect(await store.listVersions("payslip")).toHaveLength(1);
  });

  it("발행 표시를 하면 그 버전이 published가 된다", async () => {
    const store = new InMemoryTemplateStore();
    await store.save(draft());

    await store.publish("payslip", 1);

    expect((await store.get("payslip")).status).toBe("published");
  });

  it("없는 버전을 발행하려 하면 이유를 말한다", async () => {
    const store = new InMemoryTemplateStore();
    await store.save(draft());

    await expect(store.publish("payslip", 9))
      .rejects.toThrow("템플릿 판을 찾을 수 없다: payslip 9판");
  });

  it("버전 목록은 전체 템플릿을 내놓지 않는다", async () => {
    const store = new InMemoryTemplateStore();
    await store.save(draft());

    const versions = await store.listVersions("payslip");

    expect(Object.keys(versions[0] ?? {}).sort())
      .toEqual(["id", "status", "updatedAt", "version"]);
  });
});

describe("InMemoryDocumentStore", () => {
  it("만든 문서를 그대로 꺼낸다", async () => {
    const store = new InMemoryDocumentStore();
    const document = issued();

    await store.create(document);

    expect(await store.get("doc-1")).toBe(document);
  });

  it("같은 식별자로 두 번 만들지 못한다", async () => {
    const store = new InMemoryDocumentStore();
    await store.create(issued());

    await expect(store.create(issued())).rejects.toThrow("이미 있는 문서다: doc-1");
  });

  it("상태가 바뀐 문서로 갈아 끼운다", async () => {
    const store = new InMemoryDocumentStore();
    await store.create(issued());

    const viewed = (await store.get("doc-1")).markViewed("emp-1");
    await store.update(viewed);

    expect((await store.get("doc-1")).status).toBe("viewed");
  });

  it("없는 문서는 갈아 끼우지 못한다", async () => {
    await expect(new InMemoryDocumentStore().update(issued()))
      .rejects.toThrow("문서를 찾을 수 없다: doc-1");
  });
});

/** 저장 시험용 초안 템플릿이다. */
function draft(): Template {
  return new Template({
    id: "payslip", name: "급여명세서", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  });
}

/** 저장 시험용 발행 문서다. */
function issued(): IssuedDocument {
  return IssuedDocument.issue({
    id: "doc-1",
    templateId: "payslip",
    templateVersion: 1,
    recipientId: "emp-1",
    dataSnapshot: {},
    pdf: { storageKey: "documents/doc-1.pdf", sha256: new DocumentHash("a".repeat(64)), bytes: 4 },
    issuedAt: "2026-09-01T00:00:00.000Z",
    issuedBy: "admin",
  });
}
