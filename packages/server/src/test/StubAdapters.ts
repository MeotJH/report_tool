import {
  DistributionService,
  IssuanceService,
  IssuedDocument,
  PageSpec,
  SigningService,
  Template,
  type AuthAdapter,
  type DataProvider,
  type DocumentRenderer,
  type DocumentStore,
  type HashProvider,
  type RenderMode,
  type StorageAdapter,
  type TemplateStore,
} from "@report-tool/core";

/**
 * HTTP 계층만 시험하기 위한, 메모리에만 담는 어댑터 묶음이다.
 *
 * **프로덕션 코드가 아니다.** 컨트롤러가 요청을 제대로 읽고 응답을 제대로 만드는지
 * 보려면 그 뒤에 실제 서비스가 돌아야 한다. 서비스를 가짜로 바꾸면 컨트롤러가
 * 서비스를 잘못 부르고 있어도 테스트는 통과한다.
 */
export class StubWorld {
  readonly saved = new Map<string, Uint8Array>();
  readonly documents = new Map<string, IssuedDocument>();

  /** 발행 대상 템플릿을 테스트마다 갈아 끼운다. */
  constructor(private readonly template: Template = publishedTemplate()) {}

  /** 요청한 식별자와 무관하게 이 테스트가 정한 템플릿을 준다. */
  readonly templateStore: TemplateStore = {
    get: async () => this.template,
    save: async () => undefined,
    publish: async () => undefined,
    listVersions: async () => [],
  };

  /** 발행 데이터는 이름 하나면 충분하다. */
  readonly dataProvider: DataProvider = {
    sample: async () => ({ name: "샘플" }),
    resolve: async () => ({ name: "홍길동" }),
  };

  /** PDF 헤더만 흉내 낸다. 실제 렌더는 renderer 패키지가 따로 검증한다. */
  readonly renderer: DocumentRenderer = {
    render: async (_template: Template, _data: unknown, _mode: RenderMode) => (
      new Uint8Array([37, 80, 68, 70])
    ),
  };

  /** 저장한 바이트를 그대로 들고 있다가 열람 때 돌려준다. */
  readonly storage: StorageAdapter = {
    put: async (key, bytes) => { this.saved.set(key, bytes); },
    get: async (key) => {
      const found = this.saved.get(key);
      if (found === undefined) throw new Error(`저장소에 ${key}가 없다`);
      return found;
    },
  };

  /** 발행 문서를 메모리에 둔다. 상태 전이가 실제로 반영되는지 볼 수 있다. */
  readonly documentStore: DocumentStore = {
    create: async (document) => { this.documents.set(document.id, document); },
    get: async (id) => {
      const found = this.documents.get(id);
      if (found === undefined) throw new Error(`문서 ${id}를 찾을 수 없다`);
      return found;
    },
    update: async (document) => { this.documents.set(document.id, document); },
  };

  /**
   * 바이트 수를 64자 hex로 채워 돌려준다.
   *
   * 값이 무엇인지는 HTTP 계층의 관심이 아니지만 **모양은 지켜야 한다** —
   * `DocumentHash`가 64자 소문자 hex가 아니면 발행 자체를 막는다.
   */
  readonly hashProvider: HashProvider = {
    sha256: async (bytes) => bytes.length.toString(16).padStart(64, "0"),
  };

  /** 토큰은 `문서:수신자` 문자열 그대로다. 위조 토큰은 예외로 답한다. */
  readonly auth: AuthAdapter = {
    issueToken: async (documentId, recipientId) => `${documentId}:${recipientId}`,
    verifyToken: async (token) => {
      const [documentId, recipientId] = token.split(":");
      if (documentId === undefined || recipientId === undefined || recipientId === "") {
        throw new Error("토큰이 유효하지 않다");
      }
      return { documentId, recipientId };
    },
  };

  /** 컨트롤러가 부를 실제 발행 서비스다. */
  issuanceService(): IssuanceService {
    return new IssuanceService(
      this.templateStore, this.dataProvider, this.renderer,
      this.storage, this.documentStore, this.hashProvider,
    );
  }

  /** 컨트롤러가 부를 실제 배포 서비스다. */
  distributionService(): DistributionService {
    return new DistributionService(this.documentStore, this.auth);
  }

  /** 컨트롤러가 부를 실제 서명 서비스다. */
  signingService(): SigningService {
    return new SigningService(this.documentStore, this.auth, this.storage);
  }
}

/** 발행 컨트롤러 테스트가 가장 자주 쓰는 조합을 짧게 만든다. */
export function createIssuanceService(
  options: Readonly<{ template?: Template }> = {},
): IssuanceService {
  return new StubWorld(options.template ?? publishedTemplate()).issuanceService();
}

/** 발행할 수 있는 상태의 템플릿이다. */
export function publishedTemplate(): Template {
  return draftTemplate().publish();
}

/** 아직 발행하면 안 되는 초안이다. */
export function draftTemplate(): Template {
  return new Template({
    id: "payslip", name: "급여명세서", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  });
}
