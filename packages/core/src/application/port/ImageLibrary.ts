import type { ImageAsset, ImageProvider } from "./ImageProvider.js";

/**
 * 편집기가 고른 그림 파일을 호스트가 보관하고 식별자로 돌려주게 한다.
 *
 * 읽기만 하는 `ImageProvider`를 그대로 물려받는다. 발행 렌더러가 쓰는 것과 같은
 * 계약이어야, 편집 화면에 보이는 그림과 PDF에 박히는 그림이 같은 파일에서 온다.
 * 둘을 따로 두면 화면에는 로고가 보이는데 발행본만 비어 나올 수 있다.
 *
 * 파일을 직접 다루지 않고 바이트와 미디어 타입으로 받는 이유는, 도메인과
 * 애플리케이션이 브라우저를 몰라야 하기 때문이다. `File`을 읽는 일은 화면의
 * 몫이다.
 */
export interface ImageLibrary extends ImageProvider {
  /**
   * 그림을 보관하고 템플릿에 적을 식별자를 돌려준다.
   *
   * 파일 이름을 함께 받는 이유는 호스트가 사람이 알아볼 수 있는 이름으로 보관할
   * 수 있게 하기 위해서다. 식별자를 무엇으로 만들지는 호스트가 정한다 — 편집기가
   * 정하면 같은 파일을 두 번 올렸을 때 무엇이 맞는지 편집기가 판단해야 한다.
   */
  upload(asset: ImageAsset, fileName: string): Promise<string>;
}
