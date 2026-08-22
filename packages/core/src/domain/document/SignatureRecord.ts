import { DocumentHash } from "./DocumentHash.js";

/** 전자서명 한 획의 좌표와 선택적인 압력 정보를 변경 불가능한 형태로 표현한다. */
export interface SignatureStroke {
  readonly points: ReadonlyArray<readonly [number, number, number?]>;
}

/** 서명 기록의 많은 속성을 이름 기반으로 전달해 각 증거의 의미를 분명히 한다. */
export interface SignatureRecordOptions {
  readonly signer: string;
  readonly signerId: string;
  readonly signedAt: string;
  readonly documentHash: DocumentHash;
  readonly strokes: ReadonlyArray<SignatureStroke>;
  readonly imagePng: string;
  readonly authMethod: "email_link" | "sms_otp" | "sso" | "none";
  readonly ip?: string;
  readonly userAgent?: string;
}

/** 누가 어떤 문서에 어떤 방식으로 서명했는지 증명할 자료를 한데 보관한다. */
export class SignatureRecord {
  public readonly signer: string;
  public readonly signerId: string;
  public readonly signedAt: string;
  public readonly documentHash: DocumentHash;
  public readonly strokes: ReadonlyArray<SignatureStroke>;
  public readonly imagePng: string;
  public readonly authMethod: "email_link" | "sms_otp" | "sso" | "none";
  public readonly ip?: string;
  public readonly userAgent?: string;

  /** 실제 서명 흔적이 없는 빈 기록이 법적 증거처럼 저장되는 것을 막는다. */
  constructor(options: SignatureRecordOptions) {
    if (options.strokes.length === 0 && options.imagePng === "") {
      throw new Error("서명 흔적이 전혀 없다");
    }

    this.signer = options.signer;
    this.signerId = options.signerId;
    this.signedAt = options.signedAt;
    this.documentHash = options.documentHash;
    this.strokes = options.strokes.map((stroke) => ({
      points: stroke.points.map((point) => [...point] as const),
    }));
    this.imagePng = options.imagePng;
    this.authMethod = options.authMethod;
    this.ip = options.ip;
    this.userAgent = options.userAgent;
  }
}
