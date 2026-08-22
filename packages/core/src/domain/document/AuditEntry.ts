/** 감사로그에서 허용되는 행위를 제한해 상태 변화의 의미가 흔들리지 않게 한다. */
export type AuditAction =
  | "issue"
  | "view"
  | "sign"
  | "download"
  | "void"
  | "token_issued";

/** 감사 기록의 선택적 증거까지 이름 기반으로 안전하게 전달한다. */
export interface AuditEntryOptions {
  readonly at: string;
  readonly actor: string;
  readonly action: AuditAction;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly meta?: Record<string, unknown>;
}

/** 발행 문서에 언제 누가 어떤 행위를 했는지 추적할 한 건의 증거를 표현한다. */
export class AuditEntry {
  public readonly at: string;
  public readonly actor: string;
  public readonly action: AuditAction;
  public readonly ip?: string;
  public readonly userAgent?: string;
  public readonly meta?: Readonly<Record<string, unknown>>;

  /** 외부 객체 변경이 이미 남긴 감사 기록을 바꾸지 못하도록 부가 정보를 복사한다. */
  constructor(options: AuditEntryOptions) {
    this.at = options.at;
    this.actor = options.actor;
    this.action = options.action;
    this.ip = options.ip;
    this.userAgent = options.userAgent;
    this.meta = options.meta === undefined ? undefined : { ...options.meta };
  }
}
