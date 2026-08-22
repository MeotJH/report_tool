import { Frame, type Template } from "@report-tool/core";

/** 클릭과 드롭으로 추가되는 필드가 문서 안의 예측 가능한 위치를 갖게 한다. */
export class FieldPlacementPlanner {
  private static readonly DEFAULT_WIDTH_MM = 55;
  private static readonly DEFAULT_HEIGHT_MM = 9;
  private static readonly GAP_MM = 4;

  /** 빈 공간을 왼쪽 위부터 찾아 클릭만으로도 새 필드를 즉시 배치한다. */
  next(template: Template): Frame {
    const content = template.page.contentFrame();
    const size = this.fitSize(content);
    for (let y = content.y; y <= this.lastY(content, size); y += size.height + FieldPlacementPlanner.GAP_MM) {
      const available = this.findInRow(template, content, size, y);
      if (available !== undefined) return available;
    }
    return new Frame(content.x, this.lastY(content, size), size.width, size.height);
  }

  /** 사용자가 놓은 좌표를 내용 영역 안으로 제한해 잘린 필드가 생기지 않게 한다. */
  at(template: Template, x: number, y: number): Frame {
    const content = template.page.contentFrame();
    const size = this.fitSize(content);
    return new Frame(
      this.clamp(x, content.x, content.x + content.width - size.width),
      this.clamp(y, content.y, content.y + content.height - size.height),
      size.width,
      size.height,
    );
  }

  /** 현재 행에서 기존 요소와 겹치지 않는 첫 후보를 찾아 자동 배치를 안정화한다. */
  private findInRow(
    template: Template,
    content: Frame,
    size: Readonly<{ width: number; height: number }>,
    y: number,
  ): Frame | undefined {
    for (let x = content.x; x <= content.x + content.width - size.width; x += size.width + FieldPlacementPlanner.GAP_MM) {
      const candidate = new Frame(x, y, size.width, size.height);
      if (template.getElements().every((element) => !this.intersects(candidate, element.frame))) return candidate;
    }
    return undefined;
  }

  /** 작은 용지에서도 기본 크기를 내용 영역보다 크게 만들지 않는다. */
  private fitSize(content: Frame): Readonly<{ width: number; height: number }> {
    return {
      width: Math.min(FieldPlacementPlanner.DEFAULT_WIDTH_MM, content.width),
      height: Math.min(FieldPlacementPlanner.DEFAULT_HEIGHT_MM, content.height),
    };
  }

  /** 자동 탐색의 마지막 행이 아래 여백을 넘지 않도록 최대 Y를 계산한다. */
  private lastY(content: Frame, size: Readonly<{ height: number }>): number {
    return content.y + content.height - size.height;
  }

  /** 변이 만나는 요소는 허용하면서 실제 면적이 겹치는 경우만 충돌로 판단한다. */
  private intersects(first: Frame, second: Frame): boolean {
    return first.x < second.x + second.width
      && first.x + first.width > second.x
      && first.y < second.y + second.height
      && first.y + first.height > second.y;
  }

  /** 드롭 좌표를 허용 범위로 제한하는 규칙을 두 축에서 공유한다. */
  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
  }
}
