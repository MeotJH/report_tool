/**
 * 표의 한 행을 쪽 사이에서 자른 결과다.
 *
 * 자르지 못하면 자리에 들어가지 않는 행이 통째로 다음 쪽으로 밀리고, 앞 쪽
 * 아래가 그만큼 통째로 빈다. 실제 리포트에서는 한 건의 처리내용이 스무 줄을
 * 넘는 일이 흔해서, 쪽마다 아래 절반이 비고 문서가 몇 쪽씩 길어졌다.
 *
 * 더 나쁜 경우도 있다. 한 쪽에도 들어가지 않는 행은 지금까지 잘려서 **말없이
 * 사라졌다.** 자를 수 있으면 사라지지 않는다.
 */
export class TableRowSplit {
  /** 이 쪽에 그릴 칸 문자열과, 다음 쪽으로 넘길 줄 번호를 함께 담는다. */
  private constructor(
    public readonly cells: readonly string[],
    public readonly lineCount: number,
    public readonly nextLineOffset: number | null,
  ) {}

  /**
   * 줄 목록을 `lineOffset`부터 최대 `maxLines`줄까지 잘라 낸다.
   *
   * 칸마다 줄 수가 다르다. 같은 줄 번호로 함께 자르는 것이 옳다 — 원본도 그렇게
   * 자른다. 요청내용이 세 줄이고 처리내용이 서른 줄이면, 일곱 줄에서 자를 때
   * 요청내용은 세 줄 전부와 빈 네 줄, 처리내용은 앞 일곱 줄이 이 쪽에 남는다.
   */
  static of(
    lines: readonly (readonly string[])[],
    lineOffset: number,
    maxLines: number,
  ): TableRowSplit {
    const total = lines.reduce((most, cell) => Math.max(most, cell.length), 0);
    const remaining = Math.max(0, total - lineOffset);
    const taken = Math.min(remaining, Math.max(0, maxLines));
    const cells = lines.map(
      (cell) => cell.slice(lineOffset, lineOffset + taken).join("\n"),
    );
    return new TableRowSplit(
      cells,
      taken,
      lineOffset + taken >= total ? null : lineOffset + taken,
    );
  }

  /** 이 행이 남김없이 이 쪽에 담겼는지 알린다. */
  isComplete(): boolean {
    return this.nextLineOffset === null;
  }
}
