import type { Template } from "@report-tool/core";

/** 불변 템플릿 변경을 실행과 취소가 대칭인 작업 단위로 표현한다. */
export abstract class EditorCommand {
  /** 현재 초안에 작업을 적용한 다음 불변 템플릿을 반환한다. */
  abstract execute(template: Template): Template;

  /** 실행 결과에서 작업 이전 상태를 복원한 불변 템플릿을 반환한다. */
  abstract undo(template: Template): Template;
}
