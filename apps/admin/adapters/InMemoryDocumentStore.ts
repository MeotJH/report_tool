import type { DocumentStore, IssuedDocument } from "@report-tool/core";

/**
 * DB 없이 발행 문서를 메모리에 두는 참조 구현이다.
 *
 * **프로덕션 코드가 아니다.** 실제 서비스에서는 호스트가 자기 DB로 구현한다.
 *
 * 같은 식별자로 두 번 만들지 못하게 막는다. 발행 문서는 "그때 그 문서"를 증명하는
 * 자료라, 덮어쓰기가 가능하면 증명이 성립하지 않는다. 상태 변화는 `update`로만
 * 들어온다.
 */
export class InMemoryDocumentStore implements DocumentStore {
  private readonly documents = new Map<string, IssuedDocument>();

  /** 새 문서를 만든다. 이미 있으면 거절한다. */
  async create(document: IssuedDocument): Promise<void> {
    if (this.documents.has(document.id)) {
      throw new Error(`이미 있는 문서다: ${document.id}`);
    }
    this.documents.set(document.id, document);
  }

  /** 문서를 찾는다. 없으면 이유를 말한다. */
  async get(id: string): Promise<IssuedDocument> {
    const found = this.documents.get(id);
    if (found === undefined) throw new Error(`문서를 찾을 수 없다: ${id}`);
    return found;
  }

  /** 상태 전이로 만들어진 새 문서로 갈아 끼운다. 없던 문서는 만들지 않는다. */
  async update(document: IssuedDocument): Promise<void> {
    if (!this.documents.has(document.id)) {
      throw new Error(`문서를 찾을 수 없다: ${document.id}`);
    }
    this.documents.set(document.id, document);
  }
}
