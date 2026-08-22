/**
 * 페이지 위의 사각 영역을 화면 배율과 무관한 밀리미터 단위로 보존한다.
 *
 * 값 객체이므로 위치나 크기를 바꾸는 연산은 기존 객체 대신 새 객체를 반환한다.
 */
export class Frame {
  private static readonly POINTS_PER_MM = 2.834645669291339;

  /** 유효한 위치와 크기를 가진 사각 영역만 생성되도록 보장한다. */
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly width: number,
    public readonly height: number,
  ) {
    if (width < 0 || height < 0) {
      throw new Error("Frame 크기는 음수가 될 수 없다");
    }
  }

  /** 드래그한 거리만큼 기존 위치를 이동하기 위해 상대 좌표가 적용된 새 영역을 반환한다. */
  moveBy(deltaX: number, deltaY: number): Frame {
    return new Frame(this.x + deltaX, this.y + deltaY, this.width, this.height);
  }

  /** 속성 패널 등에서 지정한 좌표로 정확히 배치하기 위해 새 위치가 적용된 영역을 반환한다. */
  moveTo(x: number, y: number): Frame {
    return new Frame(x, y, this.width, this.height);
  }

  /** 편집 화면에서 특정 좌표에 놓인 요소를 선택할 수 있도록 영역 포함 여부를 판단한다. */
  contains(pointX: number, pointY: number): boolean {
    return pointX >= this.x
      && pointX <= this.x + this.width
      && pointY >= this.y
      && pointY <= this.y + this.height;
  }

  /** 값 객체의 동일성을 참조가 아닌 네 좌표 값으로 판단한다. */
  equals(other: Frame): boolean {
    return this.x === other.x
      && this.y === other.y
      && this.width === other.width
      && this.height === other.height;
  }

  /** 기존 위치를 보존하면서 크기 변경 결과를 새 값으로 표현한다. */
  resizeTo(width: number, height: number): Frame {
    return new Frame(this.x, this.y, width, height);
  }

  /** 좌상단 원점의 문서 좌표를 좌하단 원점의 PDF 좌표로 안전하게 변환한다. */
  toPdfRect(pageHeightMm: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const toPoints = (millimeters: number): number => (
      millimeters * Frame.POINTS_PER_MM
    );

    return {
      x: toPoints(this.x),
      y: toPoints(pageHeightMm - this.y - this.height),
      width: toPoints(this.width),
      height: toPoints(this.height),
    };
  }
}
