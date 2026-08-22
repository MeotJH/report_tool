import { ValueFormatter } from "./ValueFormatter.js";

/**
 * 주민등록번호와 계좌번호의 필요한 일부만 남겨 민감정보 노출을 줄인다.
 */
export class MaskFormatter extends ValueFormatter {
  /** 노출할 앞뒤 길이와 가림 문자를 하나의 재사용 가능한 정책으로 고정한다. */
  constructor(
    private readonly keepHead: number = 0,
    private readonly keepTail: number = 0,
    private readonly maskChar: string = "*",
  ) {
    super();
  }

  /** 원본 길이를 유지하면서 지정한 앞뒤 문자를 제외한 영역을 가린다. */
  format(rawValue: unknown): string {
    const value = String(rawValue);
    const headLength = Math.min(Math.max(this.keepHead, 0), value.length);
    const remainingLength = value.length - headLength;
    const tailLength = Math.min(Math.max(this.keepTail, 0), remainingLength);
    const maskedLength = remainingLength - tailLength;
    const head = value.slice(0, headLength);
    const tail = tailLength === 0 ? "" : value.slice(-tailLength);

    return `${head}${this.maskChar.repeat(maskedLength)}${tail}`;
  }
}
