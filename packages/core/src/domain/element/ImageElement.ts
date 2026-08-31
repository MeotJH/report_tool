import { Binding } from "../value/Binding.js";
import { Frame } from "../value/Frame.js";
import { Element, type ElementCommonChanges } from "./Element.js";
import type { ElementFollow } from "./ElementFollow.js";
import type { ElementVisitor } from "./ElementVisitor.js";

/** 이미지가 배치 영역에 맞춰지는 방식을 제한한다. */
export type ImageFit = "contain" | "cover" | "stretch";

/** 고정 이미지와 데이터 이미지 중 하나의 출처만 선택하게 한다. */
export interface ImageElementOptions {
  readonly assetId?: string;
  readonly binding?: Binding;
  readonly fit?: ImageFit;
}

/**
 * 이미지 출처를 고정 자산이나 데이터 바인딩 중 하나로 명확히 구분해 표시한다.
 */
export class ImageElement extends Element {
  public readonly type = "image";
  public readonly assetId: string | undefined;
  public readonly binding: Binding | undefined;
  public readonly fit: ImageFit;

  /** 모호한 이미지 출처를 생성 시점에 차단하고 하나의 출처만 보존한다. */
  constructor(
    id: string,
    frame: Frame,
    z: number,
    locked: boolean,
    options: ImageElementOptions,
    hidden = false,
    pageIndex = 0,
    repeated = false,
    follows: ElementFollow | null = null,
  ) {
    super(id, frame, z, locked, hidden, pageIndex, repeated, follows);
    this.validateSource(options);
    this.assetId = options.assetId;
    this.binding = options.binding;
    this.fit = options.fit ?? "contain";
  }

  /** 방문자가 이미지 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitImage(this);
  }

  /** 영역 채우기 방식만 바꿔도 출처 검증을 다시 통과하게 한다. */
  withFit(fit: ImageFit): ImageElement {
    return new ImageElement(this.id, this.frame, this.z, this.locked, {
      assetId: this.assetId,
      binding: this.binding,
      fit,
    }, this.hidden);
  }

  /** 고정 자산과 데이터 출처를 교체할 때도 하나만 남는 규칙을 강제한다. */
  withSource(options: Readonly<{ assetId?: string; binding?: Binding }>): ImageElement {
    return new ImageElement(this.id, this.frame, this.z, this.locked, {
      assetId: options.assetId,
      binding: options.binding,
      fit: this.fit,
    }, this.hidden);
  }

  /** 이미지 출처와 맞춤 정책을 보존하면서 공통 배치 상태만 바꾼다. */
  protected withCommon(changes: ElementCommonChanges): ImageElement {
    const resolved = this.mergeCommon(changes);
    return new ImageElement(this.id, resolved.frame, resolved.z, resolved.locked, {
      assetId: this.assetId,
      binding: this.binding,
      fit: this.fit,
    }, resolved.hidden, resolved.pageIndex, resolved.repeated, resolved.follows);
  }

  /** 이미지 고유 속성을 특정 이미지 라이브러리와 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      assetId: this.assetId,
      binding: this.binding?.toJSON(),
      fit: this.fit,
    };
  }

  /** 저장과 렌더링에서 이미지 출처가 모호해지는 상태를 생성 전에 차단한다. */
  private validateSource(options: ImageElementOptions): void {
    const hasAsset = options.assetId !== undefined;
    const hasBinding = options.binding !== undefined;
    if (hasAsset === hasBinding) {
      throw new Error("이미지는 assetId 또는 binding 중 하나만 가져야 한다");
    }
  }
}
