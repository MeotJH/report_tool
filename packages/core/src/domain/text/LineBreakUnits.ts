/**
 * 문구를 "줄을 바꿔도 되는 자리"로 잘라 낸다.
 *
 * 한글은 라틴 문자와 줄바꿈 규칙이 다르다. 라틴은 낱말 안에서 끊으면 읽을 수
 * 없게 되지만, 한글은 **글자마다 끊어도 읽힌다.** 실제로 사람이 쓰는 한국어 문서와
 * 리포트 도구는 전부 그렇게 끊는다.
 *
 * 이 차이를 무시하고 공백만 찾으면 한글 문장에서 줄이 눈에 띄게 늘어난다. 한글은
 * 공백이 드물어 어절 하나가 칸 폭보다 긴 일이 흔하고, 그럴 때마다 앞줄의 절반이
 * 빈 채로 남기 때문이다. 표 안에서는 그만큼 행이 두꺼워지고, 행이 두꺼워지면
 * 쪽이 늘어난다. 원본 리포트와 나란히 놓고 보면 쪽 수가 달라지는 원인이었다.
 *
 * 줄 첫머리에 마침표가 오는 것을 막는 규칙(금칙 처리)은 두지 않는다. 기준으로 삼은
 * 실제 리포트가 그렇게 하지 않으므로, 넣으면 오히려 원본과 달라진다.
 */
export class LineBreakUnits {
  /** 한글·한자·가나와 전각 부호는 글자 하나가 곧 줄바꿈 자리다. */
  private static readonly BREAKABLE =
    /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿︰-﹏＀-｠]/u;

  /**
   * 한 문단을 줄에 차례로 채워 넣을 조각으로 나눈다.
   *
   * 공백은 앞 조각에 붙인다. 그래야 조각을 그대로 이어 붙이면 원문이 되고,
   * 줄을 바꿀 자리에서 공백이 다음 줄 앞머리로 넘어가지 않는다.
   */
  static of(paragraph: string): readonly string[] {
    const units: string[] = [];
    let latin = "";
    for (const character of [...paragraph]) {
      if (character === " ") {
        latin = LineBreakUnits.absorbSpace(units, latin);
        continue;
      }
      if (LineBreakUnits.BREAKABLE.test(character)) {
        if (latin !== "") units.push(latin);
        latin = "";
        units.push(character);
        continue;
      }
      latin += character;
    }
    if (latin !== "") units.push(latin);
    return units;
  }

  /** 공백을 바로 앞 조각 뒤에 붙여 조각 경계가 공백으로 시작하지 않게 한다. */
  private static absorbSpace(units: string[], latin: string): string {
    if (latin !== "") {
      units.push(`${latin} `);
      return "";
    }
    const last = units.length - 1;
    if (last >= 0) {
      units[last] = `${units[last]} `;
      return "";
    }
    return " ";
  }
}
