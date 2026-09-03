/**
 * 표가 **배정된 자리에 갇히는지**를 정한다.
 *
 * 발행본에서 자리는 곧 제약이다. 스물세 건이 한 쪽에 들어가지 않으면 들어가는
 * 만큼만 그리고 나머지는 다음 쪽에 이어 그린다. 그렇지 않으면 행이 말없이 사라진다.
 *
 * 설계 화면에서는 제약이 아니다. 설계 화면의 표는 반복 단위 한 줄만 보여 주므로,
 * 배정 높이는 "이 표에 이만큼 자리를 잡아 두었다"는 뜻일 뿐이다. 그 높이에 갇히면
 * 두 가지가 틀어진다.
 *
 * - 배정이 넉넉한 표(처리내역, 104mm)는 한 줄만 그려도 자리를 다 차지해, 선택
 *   테두리가 뒤따라 올라온 다음 구역까지 덮는다.
 * - 배정이 딱 맞는 표(미처리내역, 머리글 한 줄 높이)는 **연결 줄이 잘려 사라진다.**
 *   담당자는 그 표가 데이터에 연결되지 않은 것으로 읽는다.
 *
 * 그래서 설계 화면에서는 높이를 내용이 정한다. 실제로 몇 줄이 되고 어디서 끊기는지는
 * 미리보기가 답한다.
 */
export abstract class PageOverflow {
  /** 발행본과 미리보기가 쓰는, 자리에 맞춰 자르고 다음 쪽에 이어 그리는 방식이다. */
  static paged(): PageOverflow {
    return new PagedOverflow();
  }

  /** 설계 화면이 쓰는, 내용이 높이를 정하고 쪽을 더 만들지 않는 방식이다. */
  static contentSized(): PageOverflow {
    return new ContentSizedOverflow();
  }

  /** 넘친 줄을 위해 쪽을 더 만들어도 되는지 알려 준다. */
  abstract continuesToNextPage(): boolean;

  /** 표가 이 자리에서 실제로 쓸 수 있는 높이(mm)를 정한다. */
  abstract availableHeightMm(frameHeightMm: number): number;

  /** 그려진 높이를 배정 높이 대신 쓸지 알려 준다. */
  abstract fitsToContent(): boolean;
}

/** 배정된 자리에 맞춰 자르고, 남은 줄은 다음 쪽으로 넘긴다. */
class PagedOverflow extends PageOverflow {
  /** 이어지는 쪽을 만든다. */
  continuesToNextPage(): boolean {
    return true;
  }

  /** 배정된 높이가 이 조각이 쓸 수 있는 전부다. */
  availableHeightMm(frameHeightMm: number): number {
    return frameHeightMm;
  }

  /** 자리는 담당자가 정한 그대로 둔다. */
  fitsToContent(): boolean {
    return false;
  }
}

/** 내용만큼 그리고, 쪽을 더 만들지 않는다. */
class ContentSizedOverflow extends PageOverflow {
  /** 설계 화면의 줄 수는 발행본의 줄 수가 아니므로 쪽을 늘리지 않는다. */
  continuesToNextPage(): boolean {
    return false;
  }

  /** 배정 높이에 갇히지 않는다. 그려야 할 줄은 모두 그린다. */
  availableHeightMm(): number {
    return Number.POSITIVE_INFINITY;
  }

  /** 그려진 높이를 그 표의 자리로 삼는다. */
  fitsToContent(): boolean {
    return true;
  }
}
