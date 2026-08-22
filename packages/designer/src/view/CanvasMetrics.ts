/**
 * mm 문서 좌표와 화면 픽셀 사이의 변환을 한 규칙으로 고정한다.
 *
 * 캔버스·입력 오버레이·React 레이아웃이 각자 배율을 계산하면 확대율을 바꿀 때
 * 한 곳만 어긋나 요소와 입력창의 위치가 벌어진다.
 */
export class CanvasMetrics {
  /** 96dpi 화면에서 1mm가 차지하는 논리 픽셀 수다. */
  private static readonly PX_PER_MM_AT_96_DPI = 96 / 25.4;

  /** 현재 확대율을 고정한 변환기를 만든다. */
  constructor(private readonly zoom: number) {}

  /** 100% 기준 1mm가 몇 픽셀인지 제공해 페이지 크기 계산에 쓰이게 한다. */
  static pixelsPerMillimeter(): number {
    return CanvasMetrics.PX_PER_MM_AT_96_DPI;
  }

  /** 현재 확대율이 반영된 mm당 픽셀 수를 제공한다. */
  scale(): number {
    return CanvasMetrics.PX_PER_MM_AT_96_DPI * this.zoom;
  }

  /** 문서 단위 mm를 화면 픽셀로 변환한다. */
  toPixels(millimeters: number): number {
    return millimeters * this.scale();
  }

  /** 화면 픽셀을 문서 단위 mm로 변환한다. */
  toMillimeters(pixels: number): number {
    return pixels / this.scale();
  }
}
