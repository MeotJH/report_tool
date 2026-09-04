import type { ImageAsset, ImageLibrary } from "@report-tool/core";
import { HostEndpoint } from "./HostEndpoint.js";

/**
 * 로고·직인을 호스트 앱에 올리고 다시 받아 온다.
 *
 * 식별자는 **호스트가 정한다.** 편집기가 정하면 같은 파일을 두 번 올렸을 때 무엇이
 * 맞는지 편집기가 판단해야 하고, 그 판단은 호스트의 저장 방식(같은 이름 덮어쓰기냐
 * 새 판이냐)을 알아야 내릴 수 있다.
 *
 * 발행할 때 사이드카가 읽는 것과 같은 자리에 넣는다(`GET /images/{assetId}`).
 */
export class HttpImageLibrary implements ImageLibrary {
  /** 발행본이 임베딩할 수 있는 형식이다. */
  private static readonly ALLOWED: readonly string[] = ["image/png", "image/jpeg"];

  /** 호스트 연결 하나만 있으면 된다. */
  constructor(private readonly endpoint: HostEndpoint) {}

  /**
   * 그림을 올리고 호스트가 정한 식별자를 받는다.
   *
   * 파일 이름은 **질의 문자열로** 보낸다. 헤더에 담으면 `직인.png` 같은 한글 이름이
   * 실리지 않는다 — HTTP 헤더 값에는 ASCII만 들어간다.
   */
  async upload(asset: ImageAsset, fileName: string): Promise<string> {
    const answer = await this.endpoint.postBytes(
      `/images?name=${encodeURIComponent(fileName)}`,
      asset.bytes,
      asset.mediaType,
    );
    const assetId = (answer as { assetId?: unknown } | undefined)?.assetId;
    if (typeof assetId !== "string" || assetId === "") {
      throw new Error("호스트가 그림 식별자를 주지 않았다");
    }
    return assetId;
  }

  /** 자산 식별자로 그림을 받아 온다. 형식은 받는 자리에서 막는다. */
  async load(assetId: string): Promise<ImageAsset> {
    const found = await this.endpoint.bytes(`/images/${HostEndpoint.encodePath(assetId)}`);
    if (!HttpImageLibrary.ALLOWED.includes(found.mediaType)) {
      throw new Error(`발행본에 넣을 수 없는 그림 형식이다: ${found.mediaType}`);
    }
    return { bytes: found.bytes, mediaType: found.mediaType as ImageAsset["mediaType"] };
  }
}
