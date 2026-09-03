import type { Content } from "./Content.js";
import { TemplateExpression } from "./TemplateExpression.js";

/**
 * 문구 하나를 어떤 문자열로 보여 줄지 정하는 방식을 다형적으로 고른다.
 *
 * 표에는 이미 같은 구분이 있다(`TableCellText`). 문구에는 없어서 설계 화면이
 * 표 안에서는 `row.requester`를 보여 주면서 바로 위 제목에서는 `2026년 07월`을
 * 보여 줬다. 같은 화면이 같은 물음에 두 가지로 답한 셈이다.
 *
 * 설계 화면이 답할 물음은 **"이 자리에 무엇이 들어오는가"**이고, "이번 달에 무엇이
 * 들어왔는가"는 미리보기가 답한다. 데이터를 채운 문구를 설계 화면에 두면 두 가지가
 * 틀어진다 — 고칠 수 없는 값이 고칠 수 있는 것처럼 보이고, 호스트가 샘플을 줬는지에
 * 따라 같은 양식이 전혀 다르게 보인다.
 */
export abstract class ContentText {
  /** 발행본과 미리보기가 쓰는, 문서 데이터까지 채우는 방식을 만든다. */
  static resolved(): ContentText {
    return new ResolvedContentText();
  }

  /** 설계 화면이 쓰는, 사용자가 써 넣은 표현식을 그대로 두는 방식을 만든다. */
  static source(): ContentText {
    return new SourceContentText();
  }

  /** 이 방식이 화면에 내보낼 문자열을 만든다. */
  abstract textOf(content: Content, data: unknown): string;
}

/** 고정 문구는 그대로 두고 데이터 문구만 치환한다. */
class ResolvedContentText extends ContentText {
  /** 발행 시점에 실제로 찍히는 문자열을 만든다. */
  textOf(content: Content, data: unknown): string {
    if (content.kind === "literal") return content.value;
    return TemplateExpression.render(content.value, data);
  }
}

/**
 * 사람이 써 넣은 것을 그대로 돌려준다.
 *
 * 고정 문구와 데이터 문구를 구별하지 않는다. 설계 화면에서 보고 싶은 것은 "이 자리에
 * 무엇을 써 두었는가"이고, 그 답은 두 종류 모두 저장된 문자열 자체다.
 */
class SourceContentText extends ContentText {
  /** 저장된 문자열을 손대지 않고 돌려준다. */
  textOf(content: Content): string {
    return content.value;
  }
}
