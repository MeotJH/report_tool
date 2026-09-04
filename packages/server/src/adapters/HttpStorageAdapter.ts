import type { StorageAdapter } from "@report-tool/core";
import { HostApi } from "./HostApi.js";

/**
 * 발행본 PDF를 호스트 저장소에 맡긴다.
 *
 * 사이드카 디스크에 두지 않는다. 그러면 사이드카를 두 대로 늘리는 순간 한쪽에서
 * 발행한 문서를 다른 쪽이 열지 못하고, 컨테이너를 다시 띄우면 **서명받아야 할
 * 문서가 사라진다.**
 *
 * 호스트가 S3를 쓰든 사내 파일 서버를 쓰든 우리는 모른다. 열쇠 하나로 넣고 뺀다.
 */
export class HttpStorageAdapter implements StorageAdapter {
  /** 호스트 연결 하나만 있으면 된다. */
  constructor(private readonly api: HostApi) {}

  /** 바이트를 그대로 올린다. base64로 감싸지 않는다 — 크기가 4/3으로 늘어난다. */
  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.api.putBytes(`/files/${HostApi.encodePath(key)}`, bytes, contentType);
  }

  /** 저장해 둔 바이트를 그대로 받는다. */
  async get(key: string): Promise<Uint8Array> {
    return (await this.api.bytes(`/files/${HostApi.encodePath(key)}`)).bytes;
  }
}
