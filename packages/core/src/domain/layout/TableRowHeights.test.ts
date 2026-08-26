import { describe, expect, it } from "vitest";
import { Binding } from "../value/Binding.js";
import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import { TableColumn } from "../element/TableColumn.js";
import { TableElement } from "../element/TableElement.js";
import { BoundTableSource } from "../element/TableSource.js";
import { TableCellText } from "./TableCellText.js";
import { TableLayout } from "./TableLayout.js";
import { TableRowHeights } from "./TableRowHeights.js";

/** 폰트 없이도 결과가 일정하도록 글자 수에 비례하는 폭을 쓴다. */
const measurerFactory = () => (text: string, sizePt: number): number => (
  text.length * sizePt * 0.5
);

/** 요청내용처럼 긴 문장을 담는 좁은 칸과 짧은 칸을 함께 둔 표를 만든다. */
function ticketTable(frameHeightMm = 200): TableElement {
  const style = new TextStyle("Pretendard", 9, { lineHeight: 1.2 });
  return new TableElement(
    "tickets", new Frame(10, 10, 80, frameHeightMm), 1, false,
    new BoundTableSource(new Binding("tickets")),
    [
      new TableColumn("no", "NO", "{{row.no}}", 20, "center", null),
      new TableColumn("body", "요청내용", "{{row.body}}", 60, "left", null),
    ],
    8, style, style, true, "clip",
  );
}

/** 요청내용 길이만 다른 두 건을 만든다. */
function tickets(): unknown {
  return {
    tickets: [
      { no: "1", body: "확인 부탁드립니다." },
      {
        no: "2",
        // 실제 리포트의 요청내용 한 건 정도 길이다. 60mm 칸에서 여러 줄이 된다.
        body: "안녕하십니까 저는 인사팀 담당 매니저입니다. 반차 신청 시 시간 선택이 되지 않아 "
          + "문의드립니다. 근태관리 화면에서 반차를 선택하면 시간 입력칸이 활성화되지 않아 "
          + "신청 자체가 되지 않습니다. 동일 증상이 다른 담당자 계정에서도 재현되는 것을 "
          + "확인했습니다. 확인 후 회신 부탁드립니다. 감사합니다.",
      },
    ],
  };
}

describe("TableRowHeights", () => {
  const fixed = new TableLayout(TableCellText.resolved(), TableRowHeights.fixed());
  const content = new TableLayout(
    TableCellText.resolved(), TableRowHeights.content(measurerFactory),
  );

  it("지정한 행 높이를 쓰는 방식은 모든 줄이 같은 높이다", () => {
    const result = fixed.compute(ticketTable(), tickets());

    expect(result.rows.map((row) => row.heightMm)).toEqual([8, 8, 8]);
  });

  it("내용이 긴 줄은 담기는 높이까지 늘어난다", () => {
    const result = content.compute(ticketTable(), tickets());
    const [, short, long] = result.rows;

    expect(long?.heightMm).toBeGreaterThan(short?.heightMm ?? 0);
  });

  it("내용이 짧아도 지정한 행 높이보다 낮아지지 않는다", () => {
    const result = content.compute(ticketTable(), tickets());

    expect(result.rows.every((row) => row.heightMm >= 8)).toBe(true);
  });

  it("늘어난 줄만큼 다음 줄이 아래로 밀린다", () => {
    const result = content.compute(ticketTable(), tickets());

    for (const [index, row] of result.rows.entries()) {
      if (index === 0) continue;
      const previous = result.rows[index - 1];
      expect(row.topMm).toBe((previous?.topMm ?? 0) + (previous?.heightMm ?? 0));
    }
  });

  it("늘어난 높이 때문에 표를 넘는 줄은 발행에서 빠진 줄로 센다", () => {
    // 짧은 줄 기준으로는 세 줄이 다 들어가지만, 긴 줄이 늘어나면 들어가지 않는다.
    const result = content.compute(ticketTable(24), tickets());

    expect(result.remainingRowCount).toBeGreaterThan(0);
  });

  it("빈 칸만 있는 줄은 지정한 행 높이를 그대로 쓴다", () => {
    const result = content.compute(ticketTable(), { tickets: [{ no: "", body: "" }] });

    expect(result.rows[1]?.heightMm).toBe(8);
  });
});
