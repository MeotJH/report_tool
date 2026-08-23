import type { TextStyle } from "@report-tool/core";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CanvasEditSession } from "../controller/CanvasEditSession.js";
import type { EditorActions } from "../controller/EditorActions.js";
import type { EditorController } from "../controller/EditorController.js";
import { CanvasMetrics } from "./CanvasMetrics.js";

/**
 * 현재 편집 대상이 있을 때만 캔버스 위에 실제 입력창을 겹친다.
 *
 * Konva 텍스트를 직접 편집 가능하게 만들지 않는 이유는 한글 IME 조합이다.
 * 조합 중 문자는 브라우저 입력 요소만 정확히 다루므로, 편집 순간에는 같은 위치·
 * 같은 크기의 textarea를 얹고 확정된 값만 도메인에 전달한다.
 */
export function CanvasEditOverlay(props: {
  controller: EditorController;
  actions: EditorActions;
}) {
  const target = props.controller.getEditTarget();
  if (target === null) return null;
  const session = CanvasEditSession.create(target, props.controller);
  if (session === null) return null;
  return (
    <CanvasTextInput
      key={JSON.stringify(target)}
      frame={session.frame()}
      style={session.style()}
      value={session.value()}
      zoom={props.controller.getViewport().getZoom()}
      onCommit={(input) => {
        session.commit(input, props.actions);
        props.controller.endEdit();
      }}
      onMove={(input, direction) => {
        session.commit(input, props.actions);
        const next = session.next(direction);
        if (next === undefined) props.controller.endEdit();
        else props.controller.beginEdit(next);
      }}
      onCancel={() => props.controller.endEdit()}
    />
  );
}

/** 입력 확정 규칙과 조합 처리만 담당해 편집 대상 종류를 알지 않게 한다. */
function CanvasTextInput(props: {
  frame: Readonly<{ x: number; y: number; width: number; height: number }>;
  style: TextStyle;
  value: string;
  zoom: number;
  onCommit: (value: string) => void;
  onMove: (value: string, direction: 1 | -1) => void;
  onCancel: () => void;
}) {
  /** pt로 지정된 글자 크기를 mm로 바꿀 때 쓰는 환산 계수다. */
  const POINTS_PER_MM = 72 / 25.4;
  const metrics = new CanvasMetrics(props.zoom);
  const [draft, setDraft] = useState(props.value);
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null) return;
    input.focus();
    input.select();
  }, []);

  /** 값이 달라진 경우에만 확정해 불필요한 이력을 남기지 않는다. */
  const commit = (): void => {
    if (draft === props.value) {
      props.onCancel();
      return;
    }
    props.onCommit(draft);
  };

  return (
    <textarea
      ref={inputRef}
      className="rt-text-editor"
      value={draft}
      style={{
        left: `${metrics.toPixels(props.frame.x)}px`,
        top: `${metrics.toPixels(props.frame.y)}px`,
        width: `${metrics.toPixels(props.frame.width)}px`,
        height: `${metrics.toPixels(props.frame.height)}px`,
        fontFamily: props.style.font,
        fontSize: `${metrics.toPixels(props.style.size / POINTS_PER_MM)}px`,
        fontWeight: props.style.weight,
        color: props.style.color,
        textAlign: props.style.align,
        lineHeight: props.style.lineHeight,
      }}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={() => { composingRef.current = false; }}
      onKeyDown={(event) => {
        if (isComposing(event, composingRef.current)) return;
        if (event.key === "Escape") {
          event.preventDefault();
          props.onCancel();
          return;
        }
        if (event.key === "Tab") {
          event.preventDefault();
          props.onMove(draft, event.shiftKey ? -1 : 1);
          return;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          commit();
        }
      }}
    />
  );
}

/**
 * 한글 조합 중인 입력에서 Enter와 Escape가 조합을 끊지 않게 판단한다.
 *
 * composition 이벤트만 믿으면 compositionend가 유실될 때 조합 상태가 그대로
 * 남아 Enter가 영구히 무시된다. 이벤트마다 값이 정해지는 표준 isComposing을
 * 먼저 보고, 없는 브라우저에서만 직접 추적한 상태로 보완한다.
 */
function isComposing(
  event: KeyboardEvent<HTMLTextAreaElement>,
  tracked: boolean,
): boolean {
  return event.nativeEvent.isComposing || tracked;
}
