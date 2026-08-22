import type { BoxElement } from "./BoxElement.js";
import type { FieldElement } from "./FieldElement.js";
import type { ImageElement } from "./ImageElement.js";
import type { LineElement } from "./LineElement.js";
import type { SignatureElement } from "./SignatureElement.js";
import type { TableElement } from "./TableElement.js";
import type { TextElement } from "./TextElement.js";

/**
 * 새 렌더러가 모든 요소 종류의 처리 방법을 빠짐없이 제공하도록 컴파일 시점에 강제한다.
 */
export interface ElementVisitor<TResult> {
  /** 고정·템플릿 문구를 출력 기술에 맞게 처리한다. */
  visitText(element: TextElement): TResult;

  /** 데이터에 연결된 단일 필드를 출력 기술에 맞게 처리한다. */
  visitField(element: FieldElement): TResult;

  /** 정적 또는 반복 데이터 표를 출력 기술에 맞게 처리한다. */
  visitTable(element: TableElement): TResult;

  /** 고정 또는 데이터 이미지를 출력 기술에 맞게 처리한다. */
  visitImage(element: ImageElement): TResult;

  /** 장식 사각형을 출력 기술에 맞게 처리한다. */
  visitBox(element: BoxElement): TResult;

  /** 구분선을 출력 기술에 맞게 처리한다. */
  visitLine(element: LineElement): TResult;

  /** 서명이 채워질 영역을 출력 기술에 맞게 처리한다. */
  visitSignature(element: SignatureElement): TResult;
}
