import type { SignatureStroke } from "@report-tool/core";

/** 서명 한 점이다. x·y와, 기기가 주면 필압까지. */
export type SignaturePoint = readonly [number, number, number?];

/**
 * 손이 지나간 자리를 획 단위로 모은다.
 *
 * 화면 그리기와 떼어 둔 이유는, **여기가 증거를 만드는 자리**이기 때문이다.
 * 캔버스에 그려진 그림은 다시 그리면 되지만 좌표는 한 번 놓치면 복원할 수 없다.
 * 포인터 이벤트·캔버스와 섞어 두면 이 규칙을 브라우저 없이 확인할 수 없다.
 *
 * 래스터 이미지만 남기지 않는 이유도 같다. 나중에 확대해 보거나 다른 크기로 다시
 * 그려야 할 때, 점 좌표가 있어야 깨지지 않는다.
 */
export class SignatureStrokes {
  private readonly finished: SignaturePoint[][] = [];
  private drawing: SignaturePoint[] | null = null;

  /** 새 획을 시작한다. 누른 그 점이 첫 점이다. */
  begin(point: SignaturePoint): void {
    this.drawing = [point];
  }

  /**
   * 긋는 중인 획에 점을 더한다.
   *
   * 시작하지 않았는데 들어온 점은 버린다. 캔버스 밖에서 눌렀다가 안으로 들어오는
   * 경우가 실제로 있고, 그것을 받으면 손대지 않은 획이 생긴다.
   */
  extend(point: SignaturePoint): void {
    this.drawing?.push(point);
  }

  /** 손을 뗀다. 점 하나짜리도 획으로 남긴다 — 점 찍기도 서명이다. */
  end(): void {
    if (this.drawing === null) return;
    this.finished.push(this.drawing);
    this.drawing = null;
  }

  /** 긋는 중인 획이다. 화면이 지금 이 순간을 그리는 데 쓴다. */
  current(): readonly SignaturePoint[] {
    return this.drawing ?? [];
  }

  /** 아직 아무것도 그리지 않았는지 알려 준다. */
  isEmpty(): boolean {
    return this.finished.length === 0 && this.drawing === null;
  }

  /**
   * 지금까지 그린 획을 `SignatureRecord`가 받는 모양으로 준다.
   *
   * 안쪽 배열을 그대로 주지 않는다. 밖에서 점을 더하면 화면에 그려진 것과 저장될
   * 것이 갈리고, 그 차이는 나중에 서명을 다시 그려 볼 때에야 드러난다.
   */
  getStrokes(): readonly SignatureStroke[] {
    return this.finished.map((points) => ({ points: [...points] }));
  }

  /** 다시 그릴 수 있게 비운다. */
  clear(): void {
    this.finished.length = 0;
    this.drawing = null;
  }
}
