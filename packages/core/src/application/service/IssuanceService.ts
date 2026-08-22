import type { DataProvider } from "../port/DataProvider.js";
import type { DocumentRenderer } from "../port/DocumentRenderer.js";
import type { DocumentStore } from "../port/DocumentStore.js";
import type { HashProvider } from "../port/HashProvider.js";
import type { StorageAdapter } from "../port/StorageAdapter.js";
import type { TemplateStore } from "../port/TemplateStore.js";
import { DocumentHash } from "../../domain/document/DocumentHash.js";
import { IssuedDocument } from "../../domain/document/IssuedDocument.js";
import { Template } from "../../domain/template/Template.js";

/** 실제 데이터·PDF·해시를 한 흐름에서 고정해 발행 당시의 문서를 증명 가능하게 만든다. */
export class IssuanceService {
  /** 발행 파이프라인이 구체 저장소와 렌더러를 몰라도 순서대로 실행되게 한다. */
  constructor(
    private readonly templateStore: TemplateStore,
    private readonly dataProvider: DataProvider,
    private readonly renderer: DocumentRenderer,
    private readonly storage: StorageAdapter,
    private readonly documentStore: DocumentStore,
    private readonly hashProvider: HashProvider,
  ) {}

  /** 발행 가능한 최신 템플릿으로 PDF와 데이터 스냅샷을 한 번에 동결한다. */
  async issue(
    templateId: string,
    recipientId: string,
    issuedBy: string,
  ): Promise<IssuedDocument> {
    const template = await this.templateStore.get(templateId);
    this.assertPublished(template);
    const data = await this.dataProvider.resolve(templateId, recipientId);
    const pdfBytes = await this.renderer.render(template, data, "authoritative");
    const hashHex = await this.hashProvider.sha256(pdfBytes);
    const storageKey = this.createStorageKey(templateId, recipientId);
    await this.storage.put(storageKey, pdfBytes, "application/pdf");
    const document = this.createDocument(
      template, recipientId, issuedBy, data, pdfBytes, hashHex, storageKey,
    );
    await this.documentStore.create(document);
    return document;
  }

  /** 초안이나 보관본이 실제 수신자에게 잘못 발행되는 것을 초기에 차단한다. */
  private assertPublished(template: Template): void {
    if (template.status !== "published") {
      throw new Error("발행되지 않은 템플릿은 발행할 수 없다");
    }
  }

  /** 저장소 안에서 템플릿과 수신자별 PDF 경로가 충돌하지 않게 만든다. */
  private createStorageKey(templateId: string, recipientId: string): string {
    return `documents/${templateId}/${recipientId}/${Date.now()}.pdf`;
  }

  /** 렌더 결과와 발행 당시 입력을 하나의 불변 도메인 엔티티로 묶는다. */
  private createDocument(
    template: Template,
    recipientId: string,
    issuedBy: string,
    dataSnapshot: unknown,
    pdfBytes: Uint8Array,
    hashHex: string,
    storageKey: string,
  ): IssuedDocument {
    return IssuedDocument.issue({
      id: crypto.randomUUID(),
      templateId: template.id,
      templateVersion: template.version,
      recipientId,
      dataSnapshot,
      pdf: { storageKey, sha256: new DocumentHash(hashHex), bytes: pdfBytes.length },
      issuedAt: new Date().toISOString(),
      issuedBy,
    });
  }
}
