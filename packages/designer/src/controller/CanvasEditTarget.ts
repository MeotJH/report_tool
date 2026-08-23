/**
 * 캔버스 위 입력기가 무엇을 편집 중인지 표현한다.
 *
 * 요소 id 하나만 들고 있으면 표의 어느 셀을 고치는 중인지 알 수 없다.
 * 편집 대상을 종류로 나눠 두면 입력기와 확정 명령이 같은 것을 가리키게 된다.
 */
export type CanvasEditTarget =
  | { readonly kind: "text"; readonly elementId: string }
  | {
    readonly kind: "tableHeader";
    readonly elementId: string;
    readonly columnIndex: number;
  }
  | {
    readonly kind: "tableCell";
    readonly elementId: string;
    readonly rowIndex: number;
    readonly columnIndex: number;
  };
