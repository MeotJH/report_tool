import type { SignatureStroke } from "@report-tool/core";
import { getStroke } from "perfect-freehand";
import { SignatureStrokes, type SignaturePoint } from "./SignatureStrokes.js";

/**
 * 손글씨 서명을 받아 화면에 그리고, 좌표를 증거로 남긴다.
 *
 * 그리기와 좌표 모으기를 나눠 두었다(`SignatureStrokes`). 캔버스에 그려진 그림은
 * 다시 그리면 되지만 좌표는 한 번 놓치면 복원할 수 없기 때문이다.
 *
 * 획을 그릴 때마다 **전체를 다시 그린다.** 지난 획 위에 덧그리기만 하면 필압에
 * 따라 굵기가 변하는 구간에서 앞서 그린 외곽선이 남아 지저분해진다. 서명은 커야
 * 수백 점이라 전부 다시 그려도 사람이 느끼지 못한다.
 */
export class SignaturePad {
  private readonly strokes = new SignatureStrokes();
  private readonly context: CanvasRenderingContext2D;

  /** 캔버스 하나를 서명칸으로 쓴다. 포인터 입력은 이 캔버스에서만 받는다. */
  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("캔버스 2D 컨텍스트를 얻지 못했다");
    this.context = context;
    // 손가락으로 그을 때 화면이 함께 스크롤되지 않게 한다. 이것이 없으면
    // 휴대폰에서 서명을 시작하는 순간 문서가 밀려 올라간다.
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);
  }

  /** 지금까지 그린 획을 `SignatureRecord`가 받는 모양으로 준다. */
  getStrokes(): readonly SignatureStroke[] {
    return this.strokes.getStrokes();
  }

  /** 아직 아무것도 그리지 않았는지 알려 준다. 서명 버튼을 잠그는 데 쓴다. */
  isEmpty(): boolean {
    return this.strokes.isEmpty();
  }

  /**
   * 그려진 그림을 base64 PNG로 준다.
   *
   * 좌표가 있는데도 이미지를 함께 남기는 이유는, 몇 년 뒤 이 라이브러리 없이
   * 서명을 확인해야 할 사람이 있기 때문이다. 그때 좌표만 있으면 다시 그릴 도구가
   * 필요하지만, PNG는 아무 데서나 열린다.
   */
  toPng(): string {
    return this.canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
  }

  /** 다시 그릴 수 있게 비운다. */
  clear(): void {
    this.strokes.clear();
    this.redraw();
  }

  /** 화면에서 걷어낼 때 리스너를 남기지 않는다. */
  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerUp);
  }

  /** 누른 자리에서 새 획을 시작한다. */
  private readonly onPointerDown = (event: PointerEvent): void => {
    this.canvas.setPointerCapture(event.pointerId);
    this.strokes.begin(this.toPoint(event));
    this.redraw();
  };

  /** 누른 채 움직이는 동안에만 점을 더한다. */
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.buttons === 0) return;
    this.strokes.extend(this.toPoint(event));
    this.redraw();
  };

  /** 손을 떼면 획을 확정한다. */
  private readonly onPointerUp = (): void => {
    this.strokes.end();
  };

  /**
   * 화면 좌표를 캔버스 좌표로 옮긴다.
   *
   * CSS 크기와 캔버스 픽셀 크기가 다를 수 있다. 그대로 쓰면 화면에서 그은 자리와
   * 그려지는 자리가 어긋나고, 그 어긋남은 캔버스가 작아질수록 커진다.
   */
  private toPoint(event: PointerEvent): SignaturePoint {
    const bounds = this.canvas.getBoundingClientRect();
    return [
      (event.clientX - bounds.left) * (this.canvas.width / bounds.width),
      (event.clientY - bounds.top) * (this.canvas.height / bounds.height),
      event.pressure,
    ];
  }

  /** 확정된 획과 긋는 중인 획을 한 번에 다시 그린다. */
  private redraw(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = "#111827";
    for (const stroke of this.strokes.getStrokes()) this.fill(stroke.points);
    this.fill(this.strokes.current());
  }

  /** 점 목록을 매끄러운 외곽선으로 바꿔 칠한다. */
  private fill(points: readonly SignaturePoint[]): void {
    if (points.length === 0) return;
    const outline = getStroke(points.map((point) => [...point] as number[]), {
      size: 3,
      thinning: 0.6,
      smoothing: 0.5,
      streamline: 0.5,
    });
    if (outline.length === 0) return;
    const path = new Path2D();
    path.moveTo(outline[0]?.[0] ?? 0, outline[0]?.[1] ?? 0);
    for (const [x, y] of outline.slice(1)) path.lineTo(x ?? 0, y ?? 0);
    path.closePath();
    this.context.fill(path);
  }
}
