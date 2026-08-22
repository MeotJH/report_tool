import type { TextElement } from "@report-tool/core";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CanvasMetrics } from "./CanvasMetrics.js";

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

/**
 * 캔버스 위 요소 자리에 겹쳐 실제 입력창을 띄운다.
 *
 * Konva 텍스트를 직접 편집 가능하게 만들지 않는 이유는 한글 IME 조합이다.
 * 조합 중 문자는 브라우저 입력 요소만 정확히 다루므로, 편집 순간에는
 * 같은 위치·같은 크기의 textarea를 얹고 확정된 값만 도메인에 전달한다.
 */
export function TextEditOverlay(props: {
  element: TextElement;
  zoom: number;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const metrics = new CanvasMetrics(props.zoom);
  const [draft, setDraft] = useState(props.element.content.value);
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
    if (draft === props.element.content.value) {
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
        left: `${metrics.toPixels(props.element.frame.x)}px`,
        top: `${metrics.toPixels(props.element.frame.y)}px`,
        width: `${metrics.toPixels(props.element.frame.width)}px`,
        height: `${metrics.toPixels(props.element.frame.height)}px`,
        fontFamily: props.element.style.font,
        fontSize: `${metrics.toPixels(props.element.style.size / 2.8346)}px`,
        fontWeight: props.element.style.weight,
        color: props.element.style.color,
        textAlign: props.element.style.align,
        lineHeight: props.element.style.lineHeight,
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
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          commit();
        }
      }}
    />
  );
}
