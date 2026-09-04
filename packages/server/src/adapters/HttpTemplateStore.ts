import {
  TemplateFactory,
  type Template,
  type TemplateStore,
} from "@report-tool/core";
import { HostApi } from "./HostApi.js";

/**
 * 발행할 템플릿을 호스트에서 받아 온다.
 *
 * **조회만 한다.** 양식을 만들고 고치고 발행 표시하는 일은 호스트 앱 안에서
 * 일어난다 — 편집기가 호스트의 `TemplateLibrary`로 직접 저장하기 때문이다.
 * 사이드카는 "이미 발행된 양식으로 문서를 만드는" 일만 맡는다.
 *
 * 그래서 나머지 메서드는 조용히 성공하지 않고 무엇을 하지 않는지 말한다. 조용히
 * 넘어가면 호스트는 저장이 된 줄 알고, 저장되지 않은 양식으로 발행을 시도한다.
 */
export class HttpTemplateStore implements TemplateStore {
  /** 호스트 연결 하나만 있으면 된다. */
  constructor(private readonly api: HostApi) {}

  /** 발행에 쓸 템플릿을 받아 되살린다. 버전을 주지 않으면 호스트가 정한다. */
  async get(id: string, version?: number): Promise<Template> {
    const query = version === undefined ? "" : `?version=${version}`;
    const json = await this.api.json("GET", `/templates/${HostApi.encodePath(id)}${query}`);
    return TemplateFactory.fromJSON(json as Record<string, unknown>);
  }

  /** 사이드카가 하지 않는 일이다. */
  async save(): Promise<void> {
    throw new Error("사이드카는 템플릿을 고치지 않는다. 호스트 앱에서 저장한다");
  }

  /** 사이드카가 하지 않는 일이다. */
  async publish(): Promise<void> {
    throw new Error("사이드카는 템플릿을 고치지 않는다. 호스트 앱에서 발행 표시한다");
  }

  /** 사이드카가 하지 않는 일이다. */
  async listVersions(): Promise<ReadonlyArray<Pick<Template, "id" | "version" | "status" | "updatedAt">>> {
    throw new Error("사이드카는 템플릿을 고치지 않는다. 버전 목록은 호스트 앱이 안다");
  }
}
