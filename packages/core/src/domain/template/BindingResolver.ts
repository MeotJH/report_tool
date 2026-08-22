import { FormatterRegistry } from "../format/FormatterRegistry.js";
import { Binding } from "../value/Binding.js";

/**
 * 저장된 바인딩 설정과 실제 데이터를 결합해 문서에 표시할 최종 문자열을 만든다.
 */
export class BindingResolver {
  /** 누락 정책과 포맷 전략을 일관된 순서로 적용해 최종 표시값을 반환한다. */
  resolve(binding: Binding, data: unknown): string {
    const rawValue = binding.path.resolve(data);
    if (rawValue === null || rawValue === undefined) {
      return this.resolveMissingValue(binding);
    }

    return FormatterRegistry.create(binding.formatSpec).format(rawValue);
  }

  /** 누락된 필수값은 차단하고 선택값은 설정된 대체 문자열로 정규화한다. */
  private resolveMissingValue(binding: Binding): string {
    if (binding.required) {
      throw new Error(
        `필수 필드 ${binding.path.toString()}가 데이터에 없다`,
      );
    }

    return binding.fallback ?? "";
  }
}
