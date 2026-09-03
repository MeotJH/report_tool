/**
 * 숫자 입력칸이 보여 줄 문자열과, 실제로 확정할 값을 정한다.
 *
 * 이 규칙을 입력 컴포넌트 안에 두면 검증할 수 없다. 그런데 여기서 한 자리만
 * 틀려도 문서가 조용히 바뀐다 — 화면에 반올림해 보여 준 값을 그대로 다시
 * 저장하면, 칸에 들어갔다 나오기만 해도 저장된 값이 표시 자리 수까지 깎인다.
 * 월간 리포트의 줄간격 `1.836`이 `1.84`가 되는 일이 실제로 그것이었고, 그 차이는
 * 발행본의 줄바꿈에서만 드러난다.
 *
 * 그래서 두 가지를 함께 정한다. 표시는 사람이 넣는 자리 수를 다 담을 만큼
 * 넉넉하게 하고, 확정은 **사람이 고쳐 쓴 것**만 대상으로 한다.
 */
export class NumberFieldDraft {
  /**
   * 표시할 소수 자리 수다.
   *
   * mm 좌표는 소수 둘째 자리까지, 줄간격은 셋째 자리까지 쓴다. 넷째 자리까지
   * 두면 사람이 넣은 값은 그대로 보이고, 끌어서 옮길 때 생기는 부동소수점
   * 꼬리(`0.30000000000000004`)는 화면에 나오지 않는다.
   */
  private static readonly DECIMALS = 4;

  /** 확정 범위를 벗어난 값을 조용히 통과시키지 않도록 경계를 함께 받는다. */
  constructor(
    private readonly min: number = -Number.MAX_SAFE_INTEGER,
    private readonly max: number = Number.MAX_SAFE_INTEGER,
  ) {}

  /** 저장된 값을 칸에 보여 줄 문자열로 만든다. */
  format(value: number): string {
    const factor = 10 ** NumberFieldDraft.DECIMALS;
    return String(Math.round(value * factor) / factor);
  }

  /**
   * 입력된 문자열을 확정할 값으로 바꾼다. 확정할 것이 없으면 `null`이다.
   *
   * `null`을 돌려주는 경우가 세 가지다. 숫자가 아닌 것, 그리고 **보여 준 그대로**
   * 인 것, 경계까지 맞춘 결과가 지금 값과 같은 것이다. 두 번째가 이 클래스가
   * 있는 이유다 — 사람이 손대지 않았는데 저장하면 값이 표시 자리 수로 깎인다.
   */
  resolve(draft: string, current: number): number | null {
    if (this.isUntouched(draft, current)) return null;
    const parsed = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(parsed)) return null;
    const clamped = Math.min(this.max, Math.max(this.min, parsed));
    return clamped === current ? null : clamped;
  }

  /** 보여 준 문자열과 글자 하나까지 같으면 사람이 손대지 않은 것으로 본다. */
  private isUntouched(draft: string, current: number): boolean {
    return draft.trim() === this.format(current);
  }
}
