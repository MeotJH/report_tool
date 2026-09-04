import {
  TemplateFactory,
  type Template,
  type TemplateLibrary,
  type TemplateSummary,
} from "@report-tool/core";
import { HostEndpoint } from "./HostEndpoint.js";

/**
 * 편집기가 만든 양식을 호스트 앱에 저장하고 다시 꺼낸다.
 *
 * **사이드카가 발행할 때 읽는 바로 그 자리에 넣는다.** 편집기가 다른 곳에 저장하면
 * 담당자가 만든 양식이 발행까지 이어지지 않는다 — 화면에서는 저장이 잘 되는데
 * 발행만 "그런 양식이 없다"고 답하는, 원인을 짚기 어려운 상태가 된다.
 *
 * 그래서 경로도 사이드카가 쓰는 것과 같다(`GET /templates/{id}`). 호스트는 한 벌만
 * 구현하고 편집기와 사이드카가 함께 쓴다.
 */
export class HttpTemplateLibrary implements TemplateLibrary {
  /** 호스트 연결 하나만 있으면 된다. */
  constructor(private readonly endpoint: HostEndpoint) {}

  /** 열 수 있는 문서 목록을 받아 온다. 정렬은 호스트가 정한다. */
  async list(): Promise<readonly TemplateSummary[]> {
    return await this.endpoint.json("GET", "/templates") as readonly TemplateSummary[];
  }

  /** 고른 문서를 편집할 수 있는 형태로 되살린다. */
  async load(id: string): Promise<Template> {
    const json = await this.endpoint.json("GET", `/templates/${HostEndpoint.encodePath(id)}`);
    return TemplateFactory.fromJSON(json as Record<string, unknown>);
  }

  /** 지금 문서를 같은 식별자 자리에 덮어 넣는다. */
  async save(template: Template): Promise<void> {
    await this.endpoint.json(
      "PUT",
      `/templates/${HostEndpoint.encodePath(template.id)}`,
      template.toJSON(),
    );
  }
}
