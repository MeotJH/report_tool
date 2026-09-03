import { describe, expect, it } from "vitest";
import { PageOverflow } from "./PageOverflow.js";

describe("PageOverflow.paged (발행·미리보기)", () => {
  it("배정된 높이가 이 조각이 쓸 수 있는 전부다", () => {
    expect(PageOverflow.paged().availableHeightMm(104.4)).toBe(104.4);
  });

  it("넘친 줄을 위해 쪽을 더 만든다", () => {
    expect(PageOverflow.paged().continuesToNextPage()).toBe(true);
  });

  it("담당자가 정한 자리를 그대로 둔다", () => {
    expect(PageOverflow.paged().fitsToContent()).toBe(false);
  });
});

describe("PageOverflow.contentSized (설계)", () => {
  it("배정 높이에 갇히지 않는다 — 연결 줄이 잘려 사라지면 안 된다", () => {
    expect(PageOverflow.contentSized().availableHeightMm(11.01))
      .toBe(Number.POSITIVE_INFINITY);
  });

  it("쪽을 더 만들지 않는다 — 설계의 줄 수는 발행본의 줄 수가 아니다", () => {
    expect(PageOverflow.contentSized().continuesToNextPage()).toBe(false);
  });

  it("그려진 높이를 그 표의 자리로 삼는다", () => {
    expect(PageOverflow.contentSized().fitsToContent()).toBe(true);
  });
});
