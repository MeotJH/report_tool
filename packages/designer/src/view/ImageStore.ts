import type { ImageAsset, ImageLibrary } from "@report-tool/core";

/** 바이트를 캔버스가 그릴 수 있는 그림으로 바꾸는 일만 분리해 검증 가능하게 한다. */
export interface ImageDecoder {
  /** 자산 바이트를 캔버스가 그릴 수 있는 그림으로 만든다. 실패하면 예외를 던진다. */
  decode(asset: ImageAsset): Promise<HTMLImageElement>;
}

/**
 * 편집 화면이 그릴 그림을 호스트에게서 받아 들고 있는다.
 *
 * 캔버스는 그리는 순간 그림을 이미 갖고 있어야 한다 — 그 자리에서 기다릴 수 없다.
 * 그래서 없는 그림은 자리표시자로 그리고, 받아 온 뒤에 다시 그린다.
 *
 * **못 받은 그림을 다시 받으러 가지 않는다.** 캔버스는 편집할 때마다 다시 그리므로,
 * 실패한 요청을 그때마다 되풀이하면 없는 자산 하나가 편집하는 내내 보관소를
 * 두드린다. 그리고 그 사실은 아무 화면에도 나타나지 않는다.
 */
export class ImageStore {
  private readonly loaded = new Map<string, HTMLImageElement>();
  private readonly failed = new Set<string>();
  private readonly pending = new Set<string>();

  /** 보관소·해독기·다시 그리기를 주입받아 브라우저 없이도 규칙을 검증하게 한다. */
  constructor(
    private readonly library: ImageLibrary | null,
    private readonly decoder: ImageDecoder = new BrowserImageDecoder(),
    private readonly onChange: () => void = () => undefined,
  ) {}

  /** 호스트가 보관소를 주지 않으면 올리기 단추 자체를 보여 주지 않는다. */
  canUpload(): boolean {
    return this.library !== null;
  }

  /** 지금 그릴 수 있는 그림이다. 아직 없으면 `undefined`다. */
  imageFor(assetId: string): HTMLImageElement | undefined {
    return this.loaded.get(assetId);
  }

  /** 받으려 했지만 받지 못한 자산인지 알려 준다. 화면이 그 사실을 표시해야 한다. */
  isMissing(assetId: string): boolean {
    return this.failed.has(assetId);
  }

  /**
   * 아직 없는 그림을 받아 온다. 이미 있거나 실패한 적이 있으면 아무 일도 하지 않는다.
   *
   * 빈 식별자는 "아직 고르지 않았다"는 뜻이므로 실패로 세지 않는다. 실패로 세면
   * 자리만 잡아 둔 이미지가 전부 "받지 못함" 경고를 달게 된다.
   */
  async request(assetId: string): Promise<void> {
    if (this.library === null || assetId === "") return;
    if (this.loaded.has(assetId) || this.failed.has(assetId)) return;
    if (this.pending.has(assetId)) return;
    this.pending.add(assetId);
    try {
      this.put(assetId, await this.library.load(assetId));
    } catch {
      this.failed.add(assetId);
      this.onChange();
    } finally {
      this.pending.delete(assetId);
    }
  }

  /**
   * 고른 파일을 보관소에 올리고 템플릿에 적을 식별자를 돌려준다.
   *
   * 올린 그림은 곧바로 캐시에 넣는다. 방금 올린 파일을 다시 받아 오게 두면 화면에
   * 나타나기까지 한 번 더 기다려야 하고, 그동안 사람은 올리기가 실패했다고 읽는다.
   */
  async upload(asset: ImageAsset, fileName: string): Promise<string> {
    if (this.library === null) throw new Error("그림을 보관할 곳이 없다");
    const assetId = await this.library.upload(asset, fileName);
    this.failed.delete(assetId);
    this.put(assetId, asset);
    return assetId;
  }

  /** 받아 온 자산을 그릴 수 있는 형태로 바꿔 담고 화면을 다시 그리게 한다. */
  private async put(assetId: string, asset: ImageAsset): Promise<void> {
    this.loaded.set(assetId, await this.decoder.decode(asset));
    this.onChange();
  }
}

/**
 * 실제 브라우저에서 바이트를 그림으로 만든다.
 *
 * `blob:` URL을 쓰는 이유는 base64 문자열로 만들면 큰 그림에서 메모리를 두 배로
 * 쓰고, 캔버스가 다시 그릴 때마다 문자열을 다시 해석하기 때문이다.
 */
class BrowserImageDecoder implements ImageDecoder {
  /** 그림이 실제로 읽히는 것까지 확인한 뒤에 돌려준다. */
  async decode(asset: ImageAsset): Promise<HTMLImageElement> {
    const blob = new Blob([this.toArrayBuffer(asset.bytes)], { type: asset.mediaType });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  }

  /** 뷰가 가리키는 구간만 정확히 넘겨 다른 데이터가 섞이지 않게 한다. */
  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
  }
}
