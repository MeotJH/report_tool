import type { ImageFit } from "../element/ImageElement.js";

/** 그림 하나의 원래 크기나 놓일 자리처럼, 비율만 따지는 크기다. */
export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

/** 그림을 그릴 자리다. 좌표는 배치 영역의 왼쪽 위에서 잰다. */
export interface ImageBox extends ImageSize {
  readonly x: number;
  readonly y: number;
}

/**
 * 그림이 배정된 자리를 어떻게 채울지 정한다.
 *
 * 이 계산이 캔버스와 PDF 두 곳에 있으면 반드시 갈라진다 — 실제로 PDF만 갖고
 * 있었고, 편집 화면은 그림을 아예 그리지 않아 어긋난 사실조차 드러나지 않았다.
 * 담당자가 화면에서 맞춰 놓은 로고가 발행본에서 다른 크기로 나오면, 무엇이
 * 틀렸는지 발행본을 열어 보기 전에는 알 수 없다.
 */
export abstract class ImagePlacement {
  /** 저장된 맞춤 설정에 해당하는 계산 방식을 고른다. */
  static of(fit: ImageFit): ImagePlacement {
    if (fit === "stretch") return new StretchPlacement();
    if (fit === "cover") return new CoverPlacement();
    return new ContainPlacement();
  }

  /**
   * 그림을 그릴 자리를 준다. 남거나 넘치는 만큼은 좌우·위아래로 똑같이 나눈다.
   *
   * 원래 크기를 알 수 없으면(0) 배정된 자리를 그대로 쓴다. 0으로 나누면 자리가
   * `NaN`이 되고, 그러면 그림이 그려지지 않으면서 오류도 나지 않는다.
   */
  place(natural: ImageSize, available: ImageSize): ImageBox {
    const size = natural.width <= 0 || natural.height <= 0
      ? available
      : this.sizeIn(natural, available);
    return {
      x: (available.width - size.width) / 2,
      y: (available.height - size.height) / 2,
      width: size.width,
      height: size.height,
    };
  }

  /** 맞춤 방식마다 다른 것은 그려질 크기 하나뿐이다. */
  protected abstract sizeIn(natural: ImageSize, available: ImageSize): ImageSize;
}

/** 비율을 버리고 자리를 그대로 채운다. */
class StretchPlacement extends ImagePlacement {
  /** 배정된 자리가 곧 그림의 크기다. */
  protected sizeIn(_natural: ImageSize, available: ImageSize): ImageSize {
    return available;
  }
}

/** 비율을 지키며 자리 안에 온전히 들어간다. */
class ContainPlacement extends ImagePlacement {
  /** 가로·세로 중 더 많이 줄여야 하는 쪽에 맞춘다. */
  protected sizeIn(natural: ImageSize, available: ImageSize): ImageSize {
    return scale(natural, Math.min(
      available.width / natural.width,
      available.height / natural.height,
    ));
  }
}

/** 비율을 지키며 자리를 남김없이 덮는다. 넘치는 쪽은 잘려 보인다. */
class CoverPlacement extends ImagePlacement {
  /** 가로·세로 중 덜 줄여도 되는 쪽에 맞춘다. */
  protected sizeIn(natural: ImageSize, available: ImageSize): ImageSize {
    return scale(natural, Math.max(
      available.width / natural.width,
      available.height / natural.height,
    ));
  }
}

/** 배율 하나로 두 변을 함께 늘리거나 줄인다. */
function scale(size: ImageSize, ratio: number): ImageSize {
  return { width: size.width * ratio, height: size.height * ratio };
}
