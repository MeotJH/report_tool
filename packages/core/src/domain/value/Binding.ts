import type { FormatSpec } from "../format/FormatSpec.js";
import { DataPath } from "./DataPath.js";

/** 바인딩의 선택 설정을 생성자 호출부에서 명확하게 표현한다. */
export interface BindingOptions {
  readonly formatSpec?: FormatSpec;
  readonly fallback?: string;
  readonly required?: boolean;
}

/**
 * 문서 요소가 참조할 데이터 위치와 표시 정책을 직렬화 가능한 설정으로 보존한다.
 *
 * 데이터 조회와 포맷 적용 로직은 이후 BindingResolver가 담당하도록 의도적으로 제외한다.
 */
export class Binding {
  public readonly path: DataPath;
  public readonly formatSpec: FormatSpec | null;
  public readonly fallback: string | null;
  public readonly required: boolean;

  /** 문자열 경로와 선택 설정을 항상 완전한 바인딩 값으로 정규화한다. */
  constructor(pathString: string, options: BindingOptions = {}) {
    this.path = new DataPath(pathString);
    this.formatSpec = options.formatSpec ?? null;
    this.fallback = options.fallback ?? null;
    this.required = options.required ?? false;
  }

  /** 바인딩 설정을 내부 DataPath 구조가 노출되지 않는 순수 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      path: this.path.toString(),
      formatSpec: this.formatSpec,
      fallback: this.fallback,
      required: this.required,
    };
  }
}
