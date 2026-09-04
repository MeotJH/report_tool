import { InMemoryTemplateStore } from "@report-tool/admin";

/** 그림 하나가 저장된 모양이다. */
interface StoredImage {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
}

/**
 * 호스트 앱이 가진 자료를 대신한다.
 *
 * **실제 호스트라면 여기가 급여 DB와 파일 서버다.** 데모라서 메모리에 둔다 —
 * 프로세스를 다시 띄우면 사라진다.
 *
 * `globalThis`에 붙여 두는 이유는 Next 개발 서버가 파일을 고칠 때마다 모듈을 다시
 * 불러오기 때문이다. 모듈 변수에 담으면 양식을 저장하고 코드를 한 줄 고치는 순간
 * 저장한 것이 사라진다.
 */
export class HostStore {
  readonly templates = new InMemoryTemplateStore();

  /**
   * 저장된 양식의 식별자다.
   *
   * `TemplateStore` 포트에는 "전부 나열"이 없다 — 발행에 필요 없기 때문이다.
   * 편집기의 "열기" 목록은 호스트가 자기 방식으로 만든다. 실제 호스트라면
   * `SELECT id FROM templates` 한 줄이다.
   */
  readonly templateIds = new Set<string>();
  readonly documents = new Map<string, Record<string, unknown>>();
  readonly files = new Map<string, Uint8Array>();
  readonly images = new Map<string, StoredImage>();

  /** 이 프로세스가 쓰는 단 하나의 저장소를 준다. */
  static shared(): HostStore {
    const holder = globalThis as { __reportToolHostStore?: HostStore };
    holder.__reportToolHostStore ??= new HostStore();
    return holder.__reportToolHostStore;
  }
}
