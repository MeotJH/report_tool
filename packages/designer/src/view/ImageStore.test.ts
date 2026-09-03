import type { ImageAsset, ImageLibrary } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { ImageStore, type ImageDecoder } from "./ImageStore.js";

describe("ImageStore", () => {
  it("아직 받지 않은 그림은 없는 것으로 답한다", () => {
    const { store } = createStore();

    expect(store.imageFor("logo")).toBeUndefined();
  });

  it("받아 온 그림을 담아 두고 화면에 알린다", async () => {
    const { store, changes } = createStore({ logo: asset() });

    await store.request("logo");

    expect(store.imageFor("logo")).toBeDefined();
    expect(changes()).toBe(1);
  });

  it("같은 그림을 두 번 받지 않는다", async () => {
    const { store, library } = createStore({ logo: asset() });

    await store.request("logo");
    await store.request("logo");

    expect(library.loadCount).toBe(1);
  });

  it("받지 못한 그림을 다시 받으려 하지 않는다", async () => {
    const { store, library } = createStore({});

    await store.request("logo");
    await store.request("logo");

    expect(library.loadCount).toBe(1);
  });

  it("받지 못한 그림은 못 받았다고 답한다", async () => {
    const { store } = createStore({});

    await store.request("logo");

    expect(store.isMissing("logo")).toBe(true);
  });

  it("빈 식별자는 받으려 하지 않는다", async () => {
    const { store, library } = createStore({});

    await store.request("");

    expect(library.loadCount).toBe(0);
  });

  it("올린 그림은 식별자를 돌려주고 곧바로 화면에 나온다", async () => {
    const { store } = createStore({});

    const assetId = await store.upload(asset(), "logo.png");

    expect(assetId).toBe("uploaded-logo.png");
    expect(store.imageFor(assetId)).toBeDefined();
  });

  it("보관소를 주지 않으면 그림을 올릴 수 없다", () => {
    const store = new ImageStore(null, new FakeDecoder(), () => undefined);

    expect(store.canUpload()).toBe(false);
  });
});

/** 테스트가 다루기 쉬운 최소 이미지 자산이다. */
function asset(): ImageAsset {
  return { bytes: new Uint8Array([1, 2, 3]), mediaType: "image/png" };
}

/** 호스트 보관소 자리에 들어가는, 메모리에만 담는 구현이다. */
class FakeImageLibrary implements ImageLibrary {
  loadCount = 0;

  /** 무엇을 몇 번 읽었는지 테스트가 그대로 확인하게 한다. */
  constructor(private readonly assets: Record<string, ImageAsset>) {}

  /** 없는 식별자는 호스트가 그러듯 예외로 답한다. */
  async load(assetId: string): Promise<ImageAsset> {
    this.loadCount += 1;
    const found = this.assets[assetId];
    if (found === undefined) throw new Error(`보관소에 ${assetId}가 없다`);
    return found;
  }

  /** 식별자를 호스트가 정한다는 사실이 드러나게 접두사를 붙인다. */
  async upload(asset: ImageAsset, fileName: string): Promise<string> {
    const assetId = `uploaded-${fileName}`;
    this.assets[assetId] = asset;
    return assetId;
  }
}

/** 브라우저 없이 해독 결과만 흉내 낸다. */
class FakeDecoder implements ImageDecoder {
  /** 무엇으로 해독됐는지는 이 클래스의 관심이 아니다. */
  async decode(): Promise<HTMLImageElement> {
    return {} as HTMLImageElement;
  }
}

/** 보관소와 해독기를 이어 둔 기본 상태를 만든다. */
function createStore(assets: Record<string, ImageAsset> = {}): {
  store: ImageStore;
  library: FakeImageLibrary;
  changes: () => number;
} {
  const library = new FakeImageLibrary(assets);
  let count = 0;
  const store = new ImageStore(library, new FakeDecoder(), () => { count += 1; });
  return { store, library, changes: () => count };
}
