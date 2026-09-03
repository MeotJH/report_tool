import { PastedGrid } from "@report-tool/core";
import { useState } from "react";
import { ToggleField } from "./InspectorFields.js";

/**
 * 스프레드시트에서 복사한 표를 그대로 붙여넣게 한다.
 *
 * 표 하나에 머리글이 여덟 칸이고 그런 표가 다섯 개다. 한 칸씩 캔버스에서
 * 더블클릭해 넣으면 백지에서 시작할 수 없다 — 담당자는 이미 그 표를 엑셀로 갖고
 * 있으므로, 옮겨 적게 하지 말고 받아야 한다.
 *
 * `Ctrl+V`를 가로채지 않는다. 그 키는 이미 요소 복사에 쓰이고 있어서, 가로채면 요소
 * 붙여넣기와 표 붙여넣기가 한 번에 둘 다 일어난다. 대신 붙여넣을 자리를 눈에 보이게
 * 둔다 — 어디에 붙여넣어야 하는지 묻지 않아도 알 수 있다.
 */
export function GridPasteField(props: {
  onApply: (grid: PastedGrid, firstRowIsHeader: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const grid = PastedGrid.parse(text);

  if (!open) {
    return (
      <button className="rt-panel-button" type="button" onClick={() => setOpen(true)}>
        ⎘ 엑셀에서 붙여넣기
      </button>
    );
  }
  return (
    <div className="rt-column-card">
      <p className="rt-inspector-note">
        엑셀에서 표 범위를 복사해 아래에 붙여넣으세요(<code>Ctrl+V</code>).
        칸은 탭으로, 행은 줄바꿈으로 나뉩니다.
      </p>
      <textarea
        className="rt-grid-paste"
        value={text}
        rows={4}
        placeholder={"상위업무명\t하위업무명\t총요청건수"}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <ToggleField
        label="첫 줄을 열 이름으로"
        value={firstRowIsHeader}
        onCommit={setFirstRowIsHeader}
      />
      <p className="rt-inspector-note">{describe(grid, firstRowIsHeader)}</p>
      <div className="rt-button-row">
        <button
          className="rt-panel-button"
          type="button"
          onClick={() => { setOpen(false); setText(""); }}
        >
          취소
        </button>
        <button
          className="rt-panel-button rt-panel-button--primary"
          type="button"
          disabled={grid.isEmpty()}
          onClick={() => {
            props.onApply(grid, firstRowIsHeader);
            setOpen(false);
            setText("");
          }}
        >
          이 표에 넣기
        </button>
      </div>
    </div>
  );
}

/**
 * 무엇이 만들어질지 누르기 전에 알려 준다.
 *
 * 붙여넣기는 표의 열과 행을 통째로 바꾼다. 되돌릴 수 있어도, 무엇으로 바뀔지 모르고
 * 누르게 두면 한 번은 반드시 잘못 누른다.
 */
function describe(grid: PastedGrid, firstRowIsHeader: boolean): string {
  if (grid.isEmpty()) return "붙여넣으면 몇 열 몇 행이 만들어지는지 여기 나옵니다.";
  const bodyRows = firstRowIsHeader ? grid.rowCount() - 1 : grid.rowCount();
  return `열 ${grid.columnCount()}개 · 본문 ${bodyRows}행이 만들어집니다.`
    + " 지금 열과 행은 사라집니다.";
}
