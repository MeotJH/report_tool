import { describe, expect, it, vi } from "vitest";
import type { DataProvider } from "../port/DataProvider";
import type { DocumentRenderer } from "../port/DocumentRenderer";
import type { DocumentStore } from "../port/DocumentStore";
import type { HashProvider } from "../port/HashProvider";
import type { StorageAdapter } from "../port/StorageAdapter";
import type { TemplateStore } from "../port/TemplateStore";
import { Template, type TemplateStatus } from "../../domain/template/Template";
import { PageSpec } from "../../domain/value/PageSpec";
import { IssuanceService } from "./IssuanceService";

describe("IssuanceService", () => {
  it("발행되지 않은 템플릿은 파일과 문서 저장소에 기록하지 않는다", async () => {
    const fixture = createFixture("draft");

    await expect(fixture.service.issue("payslip", "employee-1", "admin-1"))
      .rejects.toThrow("발행되지 않은 템플릿은 발행할 수 없다");
    expect(fixture.storagePut).not.toHaveBeenCalled();
    expect(fixture.documentCreate).not.toHaveBeenCalled();
  });

  it("실제 데이터로 권위 PDF를 만들고 발행 문서를 한 번씩 저장한다", async () => {
    const fixture = createFixture("published");

    const document = await fixture.service.issue("payslip", "employee-1", "admin-1");

    expect(document.status).toBe("issued");
    expect(fixture.render).toHaveBeenCalledWith(
      expect.any(Template),
      fixture.data,
      "authoritative",
    );
    expect(fixture.storagePut).toHaveBeenCalledOnce();
    expect(fixture.documentCreate).toHaveBeenCalledExactlyOnceWith(document);
  });

  it("해시 제공자가 계산한 값을 발행 PDF 해시로 동결한다", async () => {
    const fixture = createFixture("published");

    const document = await fixture.service.issue("payslip", "employee-1", "admin-1");

    expect(document.pdf.sha256.toHex()).toBe("a".repeat(64));
  });
});

/** 각 외부 기술을 스텁으로 바꿔 발행 파이프라인의 조율만 관찰하게 한다. */
function createFixture(status: TemplateStatus): {
  service: IssuanceService;
  data: unknown;
  render: ReturnType<typeof vi.fn>;
  storagePut: ReturnType<typeof vi.fn>;
  documentCreate: ReturnType<typeof vi.fn>;
} {
  const template = createTemplate(status);
  const data = { salary: 3_800_000 };
  const render = vi.fn(async () => new Uint8Array([1, 2, 3]));
  const storagePut = vi.fn(async (): Promise<void> => undefined);
  const documentCreate = vi.fn(async (): Promise<void> => undefined);
  const templateStore = createTemplateStore(template);
  const dataProvider = createDataProvider(data);
  const renderer: DocumentRenderer = { render };
  const storage = createStorage(storagePut);
  const documentStore = createDocumentStore(documentCreate);
  const hashProvider: HashProvider = { sha256: vi.fn(async () => "a".repeat(64)) };
  return {
    service: new IssuanceService(
      templateStore,
      dataProvider,
      renderer,
      storage,
      documentStore,
      hashProvider,
    ),
    data,
    render,
    storagePut,
    documentCreate,
  };
}

/** 발행 상태만 달라지는 템플릿 저장소 스텁을 만든다. */
function createTemplateStore(template: Template): TemplateStore {
  return {
    get: vi.fn(async () => template),
    save: vi.fn(async () => undefined),
    publish: vi.fn(async () => undefined),
    listVersions: vi.fn(async () => []),
  };
}

/** 발행용 데이터 반환만 필요한 공급자 스텁을 만든다. */
function createDataProvider(data: unknown): DataProvider {
  return {
    fields: vi.fn(async () => ({})),
    sample: vi.fn(async () => ({})),
    resolve: vi.fn(async () => data),
  };
}

/** 저장 호출을 관찰하면서 사용하지 않는 조회도 계약에 맞춰 제공한다. */
function createStorage(put: ReturnType<typeof vi.fn>): StorageAdapter {
  return { put, get: vi.fn(async () => new Uint8Array()) };
}

/** 문서 생성 호출을 관찰할 최소 저장소 스텁을 만든다. */
function createDocumentStore(create: ReturnType<typeof vi.fn>): DocumentStore {
  return {
    create,
    get: vi.fn(async () => { throw new Error("호출하지 않는다"); }),
    update: vi.fn(async () => undefined),
  };
}

/** 발행 여부 외의 조건이 테스트 결과에 영향을 주지 않는 템플릿을 만든다. */
function createTemplate(status: TemplateStatus): Template {
  return new Template({
    id: "payslip",
    name: "급여명세서",
    version: 2,
    status,
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: [],
    elements: [],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}
