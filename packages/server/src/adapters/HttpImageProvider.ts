import type { ImageAsset, ImageProvider } from "@report-tool/core";
import { HostApi } from "./HostApi.js";

/**
 * 로고·직인을 호스트에서 받아 온다.
 *
 * 형식을 여기서 막는다. 발행 렌더러는 PNG와 JPEG만 임베딩할 수 있고, 그 밖의
 * 형식은 렌더 도중에 예외가 된다. **발행이 절반쯤 진행된 뒤에 실패하는 것보다
 * 받아 오는 자리에서 막는 편이 원인을 훨씬 빨리 말해 준다.**
 */
export class HttpImageProvider implements ImageProvider {
  /** 발행본이 임베딩할 수 있는 형식이다. */
  private static readonly ALLOWED: readonly string[] = ["image/png", "image/jpeg"];

  /** 호스트 연결 하나만 있으면 된다. */
  constructor(private readonly api: HostApi) {}

  /** 자산 식별자로 그림을 받아 온다. */
  async load(assetId: string): Promise<ImageAsset> {
    const found = await this.api.bytes(`/images/${HostApi.encodePath(assetId)}`);
    if (!HttpImageProvider.ALLOWED.includes(found.mediaType)) {
      throw new Error(`발행본에 넣을 수 없는 그림 형식이다: ${found.mediaType}`);
    }
    return { bytes: found.bytes, mediaType: found.mediaType as ImageAsset["mediaType"] };
  }
}
