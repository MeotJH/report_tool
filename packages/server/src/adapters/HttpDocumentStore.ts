import {
  IssuedDocumentFactory,
  type DocumentStore,
  type IssuedDocument,
} from "@report-tool/core";
import { HostApi } from "./HostApi.js";

/**
 * 발행 문서를 호스트 DB에 맡긴다.
 *
 * 사이드카는 아무것도 오래 들고 있지 않는다. 프로세스가 죽어도 잃을 것이 없어야
 * 재시작·다중화가 가능하고, 무엇보다 **급여 문서가 우리 쪽에 남지 않는다.**
 *
 * 문서를 JSON으로 주고받을 수 있는 것은 `IssuedDocument.toJSON`과
 * `IssuedDocumentFactory`가 생긴 덕이다. 그 전에는 서명된 문서를 되살릴 수 없어
 * 이 어댑터 자체가 성립하지 않았다.
 */
export class HttpDocumentStore implements DocumentStore {
  /** 호스트 연결 하나만 있으면 된다. */
  constructor(private readonly api: HostApi) {}

  /** 새로 발행한 문서를 호스트에 넘긴다. */
  async create(document: IssuedDocument): Promise<void> {
    await this.api.json("POST", "/documents", document.toJSON());
  }

  /** 문서를 상태·서명·감사 기록까지 그대로 받아 온다. */
  async get(id: string): Promise<IssuedDocument> {
    const json = await this.api.json("GET", `/documents/${HostApi.encodePath(id)}`);
    return IssuedDocumentFactory.fromJSON(json as Record<string, unknown>);
  }

  /** 상태가 바뀐 문서로 덮어 쓴다. 같은 식별자 자리에 그대로 간다. */
  async update(document: IssuedDocument): Promise<void> {
    await this.api.json("PUT", `/documents/${HostApi.encodePath(document.id)}`, document.toJSON());
  }
}
