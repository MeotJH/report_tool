/**
 * 캔버스 확대율을 문서 내용과 분리된 보기 상태로 관리한다.
 *
 * 확대는 문서를 바꾸지 않으므로 Command 이력에 넣지 않는다. 실행 취소가 화면
 * 배율까지 되돌리면 사용자가 방향을 잃는다. 화면 이동은 브라우저 기본 스크롤을
 * 그대로 쓰므로 여기서 다루지 않는다.
 */
export class ViewportState {
  private static readonly MIN_ZOOM = 0.2;
  private static readonly MAX_ZOOM = 4;
  private static readonly STEPS: readonly number[] = [
    0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4,
  ];

  private zoom = 1;

  /** 화면 좌표 변환과 확대율 표시가 같은 값을 쓰게 한다. */
  getZoom(): number {
    return this.zoom;
  }

  /** 상태바가 사람이 읽는 확대율을 정수 퍼센트로 표시하게 한다. */
  getZoomPercent(): number {
    return Math.round(this.zoom * 100);
  }

  /** 임의 확대율 입력도 지원 범위 안으로 제한한다. */
  setZoom(zoom: number): void {
    this.zoom = Math.min(ViewportState.MAX_ZOOM, Math.max(ViewportState.MIN_ZOOM, zoom));
  }

  /** 단축키 확대가 사람이 예상하는 단계를 밟게 한다. */
  zoomIn(): void {
    this.setZoom(ViewportState.STEPS.find((step) => step > this.zoom + 0.001)
      ?? ViewportState.MAX_ZOOM);
  }

  /** 단축키 축소가 사람이 예상하는 단계를 밟게 한다. */
  zoomOut(): void {
    this.setZoom([...ViewportState.STEPS].reverse()
      .find((step) => step < this.zoom - 0.001) ?? ViewportState.MIN_ZOOM);
  }

  /** 실제 인쇄 크기 기준으로 즉시 돌아갈 수 있게 한다. */
  resetZoom(): void {
    this.zoom = 1;
  }

  /** 문서 전체가 보이는 확대율을 계산해 적용한다. */
  fit(
    pageWidthPx: number,
    pageHeightPx: number,
    viewportWidthPx: number,
    viewportHeightPx: number,
    paddingPx = 40,
  ): void {
    const availableWidth = Math.max(1, viewportWidthPx - paddingPx * 2);
    const availableHeight = Math.max(1, viewportHeightPx - paddingPx * 2);
    this.setZoom(Math.min(
      availableWidth / pageWidthPx,
      availableHeight / pageHeightPx,
    ));
  }
}
