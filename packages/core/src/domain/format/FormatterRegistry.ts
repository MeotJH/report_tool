import { CurrencyFormatter } from "./CurrencyFormatter.js";
import { DateFormatter } from "./DateFormatter.js";
import type { FormatSpec } from "./FormatSpec.js";
import { MaskFormatter } from "./MaskFormatter.js";
import { NumberFormatter } from "./NumberFormatter.js";
import { PercentFormatter } from "./PercentFormatter.js";
import { PlainTextFormatter } from "./PlainTextFormatter.js";
import { ValueFormatter } from "./ValueFormatter.js";

/**
 * 직렬화된 포맷 설정을 실행 가능한 전략으로 바꾸는 분기를 한곳에 모은다.
 */
export class FormatterRegistry {
  /** 호출자가 포맷 종류를 분기하지 않고 적절한 전략을 받을 수 있게 한다. */
  static create(spec: FormatSpec | null): ValueFormatter {
    if (spec === null) {
      return new PlainTextFormatter();
    }

    switch (spec.kind) {
      case "text":
        return new PlainTextFormatter();
      case "currency":
        return new CurrencyFormatter(spec.currency, spec.showSymbol ?? true);
      case "number":
        return new NumberFormatter(spec.decimals ?? 0, spec.thousands ?? true);
      case "date":
        return new DateFormatter(spec.pattern);
      case "mask":
        return new MaskFormatter(spec.keepHead, spec.keepTail, spec.maskChar);
      case "percent":
        return new PercentFormatter(spec.decimals ?? 0);
      default:
        throw new Error("지원하지 않는 포맷 종류다");
    }
  }
}
