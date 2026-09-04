import type { DataProvider } from "@report-tool/core";
import { HostApi } from "./HostApi.js";

/**
 * 발행에 쓸 데이터를 호스트에게 물어본다.
 *
 * **사이드카는 급여 DB를 모른다.** 스키마도 접속 정보도 갖지 않는다. 그래서
 * 사이드카가 뚫려도 거기서 새어 나갈 데이터가 없고, 호스트는 어느 사원 것을
 * 내줄지 자기 권한 규칙으로 정한다.
 *
 * 표본과 실제 데이터를 다른 자리에서 받는 이유는 `DataProvider`가 둘을 나눈 이유와
 * 같다 — 표본은 아무나 보는 화면에 쓰이고, 실제 데이터는 그 사람 것이다.
 */
export class HttpDataProvider implements DataProvider {
  /** 호스트 연결 하나만 있으면 된다. */
  constructor(private readonly api: HostApi) {}

  /** 미리보기에 쓸 표본이다. 가리는 일은 호스트가 한다. */
  async sample(templateId: string): Promise<unknown> {
    return this.api.json("GET", `/data/${HostApi.encodePath(templateId)}/sample`);
  }

  /** 발행할 실제 데이터다. */
  async resolve(templateId: string, recipientId: string): Promise<unknown> {
    return this.api.json(
      "GET",
      `/data/${HostApi.encodePath(templateId)}/${HostApi.encodePath(recipientId)}`,
    );
  }
}
