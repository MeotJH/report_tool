import { createHash } from "node:crypto";
import type { HashProvider } from "@report-tool/core";

/**
 * Node 내장 암호 모듈로 PDF 해시를 만든다.
 *
 * 이 값이 "무엇에 서명했는가"의 근거다. 발행 때 잰 해시와 서명 때 잰 해시가 같아야
 * 그 사이에 문서가 바뀌지 않았음을 말할 수 있다.
 */
export class NodeCryptoHashProvider implements HashProvider {
  /** 도메인이 받는 모양(소문자 hex 64자)으로 돌려준다. */
  async sha256(bytes: Uint8Array): Promise<string> {
    return createHash("sha256").update(bytes).digest("hex");
  }
}
