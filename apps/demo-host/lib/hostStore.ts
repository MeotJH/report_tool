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
 *
 * **양식을 `Template` 객체가 아니라 JSON으로 담는다.** 이유가 둘이다.
 *
 * 하나는 그것이 실제 호스트의 모습이라서다. DB에는 JSON이 들어가지 살아 있는
 * 객체가 들어가지 않는다.
 *
 * 다른 하나가 더 중요하다. Next는 라우트마다 서버 번들을 따로 만들어서, 한
 * 라우트가 만든 `FieldElement`를 다른 라우트에서 보면 **`instanceof`가 조용히
 * 거짓이 된다.** 같은 소스라도 로드된 모듈이 다르면 다른 클래스다. 라이브러리는
 * Visitor로 요소 종류를 가르므로 이 사고가 나면 요소를 하나도 알아보지 못하고,
 * 예외도 로그도 없이 빈 결과가 나온다. 실제로 그렇게 됐고 증상은 "데이터 명세가
 * 텅 비어 있다"였다.
 *
 * JSON으로 담으면 읽는 쪽이 `TemplateFactory.fromJSON`으로 자기 클래스를 써서
 * 되살리므로 이 문제가 생기지 않는다.
 */
export class HostStore {
  /**
   * 양식 저장 JSON이다. 열쇠는 `{id}@{version}`.
   *
   * **판마다 따로 담는다.** 하나만 담으면 v2를 만드는 순간 v1이 사라지고,
   * 이미 발행된 문서가 가리키는 판을 되찾을 수 없다. 그러면 "무엇에 서명했는가"를
   * 문서 쪽에서만 증명해야 한다.
   */
  private readonly templateVersions = new Map<string, Record<string, unknown>>();
  readonly documents = new Map<string, Record<string, unknown>>();
  readonly files = new Map<string, Uint8Array>();
  readonly images = new Map<string, StoredImage>();

  /** 양식 한 판을 담는다. 같은 판을 다시 담으면 덮어쓴다 — 초안은 계속 바뀐다. */
  saveTemplate(saved: Record<string, unknown>): void {
    this.templateVersions.set(HostStore.keyOf(saved), saved);
  }

  /** 그 양식의 가장 높은 판을 준다. 편집기와 목록이 보는 것이다. */
  latestTemplate(id: string): Record<string, unknown> | undefined {
    return this.versionsOf(id).at(-1);
  }

  /** 판을 지정해 꺼낸다. 발행된 문서가 자기 근거를 되찾을 때 쓴다. */
  templateAt(id: string, version: number): Record<string, unknown> | undefined {
    return this.templateVersions.get(`${id}@${version}`);
  }

  /** 양식마다 최신 판 하나씩. 목록 화면이 읽는다. */
  latestTemplates(): readonly Record<string, unknown>[] {
    const byId = new Map<string, Record<string, unknown>>();
    for (const saved of this.templateVersions.values()) {
      const id = String(saved["id"]);
      const known = byId.get(id);
      if (known === undefined || Number(saved["version"]) > Number(known["version"])) {
        byId.set(id, saved);
      }
    }
    return [...byId.values()];
  }

  /** 그 양식의 모든 판을 지운다. 하나도 없었으면 `false`다. */
  removeTemplate(id: string): boolean {
    const keys = [...this.templateVersions.keys()]
      .filter((key) => key.startsWith(`${id}@`));
    for (const key of keys) this.templateVersions.delete(key);
    return keys.length > 0;
  }

  /** 그 양식의 판들을 낮은 것부터 준다. */
  private versionsOf(id: string): readonly Record<string, unknown>[] {
    return [...this.templateVersions.values()]
      .filter((saved) => saved["id"] === id)
      .sort((first, second) => Number(first["version"]) - Number(second["version"]));
  }

  /** 판까지 포함한 저장 열쇠다. */
  private static keyOf(saved: Record<string, unknown>): string {
    return `${String(saved["id"])}@${String(saved["version"])}`;
  }

  /**
   * 이 양식의 이 판으로 발행한 문서가 있는지 본다.
   *
   * 발행 표시를 되돌려도 되는지 판단하는 근거다. 발행본은 자기가 어느 판을
   * 근거로 만들어졌는지 가리키고 있고, 그 판이 다시 편집 가능해지면 "무엇에
   * 서명했는가"에 답할 수 없게 된다.
   */
  hasDocumentsFrom(templateId: string, version: number): boolean {
    for (const document of this.documents.values()) {
      if (document["templateId"] === templateId && document["templateVersion"] === version) {
        return true;
      }
    }
    return false;
  }

  /** 이 프로세스가 쓰는 단 하나의 저장소를 준다. */
  static shared(): HostStore {
    const holder = globalThis as { __reportToolHostStore?: HostStore };
    holder.__reportToolHostStore ??= new HostStore();
    return holder.__reportToolHostStore;
  }
}
