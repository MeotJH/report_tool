/**
 * 엑셀·스프레드시트에서 복사한 텍스트를 표의 격자로 바꾼다.
 *
 * 월간 리포트의 표 다섯 개에는 머리글과 고정 문구가 161칸 있다. 그것을 한 칸씩
 * 손으로 넣게 두면 백지에서 시작할 수 없다 — 한 칸만 틀려도 그 열만 빈칸으로
 * 발행되고, 어디가 틀렸는지 찾는 데 만드는 시간보다 오래 걸린다. 담당자는 이미
 * 그 표를 엑셀로 갖고 있다.
 *
 * 파싱을 손으로 하지 않는 이유는 스프레드시트가 **칸 안의 줄바꿈과 탭을 인용부호로
 * 감싸서** 보내기 때문이다. `줄바꿈이 든 칸`을 단순히 `\n`으로 자르면 한 행이 두
 * 행으로 쪼개지고, 그 뒤 모든 열이 한 칸씩 밀린다. 원본 리포트의 `등록\n번호`가
 * 정확히 그런 칸이다.
 */
export class PastedGrid {
  /** 칸을 나누는 문자다. 스프레드시트는 탭으로 붙여넣는다. */
  private static readonly CELL_SEPARATOR = "\t";

  /** 인용부호로 감싼 칸 안에서 인용부호 자신을 나타내는 방법이다. */
  private static readonly QUOTE = "\"";

  /** 격자는 만들어진 뒤 바뀌지 않는다. */
  private constructor(private readonly grid: readonly (readonly string[])[]) {}

  /** 붙여넣은 텍스트를 격자로 만든다. 열 수는 가장 긴 행에 맞춘다. */
  static parse(text: string): PastedGrid {
    const rows = new PastedGridReader(text).read();
    const trimmed = PastedGrid.withoutTrailingBlank(rows);
    return new PastedGrid(PastedGrid.padded(trimmed));
  }

  /** 행 목록이다. 각 행은 열 수만큼의 칸을 갖는다. */
  rows(): readonly (readonly string[])[] {
    return this.grid;
  }

  /** 열 수다. 가장 긴 행이 정한다. */
  columnCount(): number {
    return this.grid[0]?.length ?? 0;
  }

  /** 행 수다. */
  rowCount(): number {
    return this.grid.length;
  }

  /** 표로 만들 것이 없으면 참이다. */
  isEmpty(): boolean {
    return this.grid.length === 0 || this.columnCount() === 0;
  }

  /**
   * 첫 줄을 열 이름으로 떼어 낸다. 남은 줄이 본문이 된다.
   *
   * 본문이 하나도 남지 않아도 열 이름은 살린다. 머리글만 복사해 오는 것이 이 기능을
   * 쓰는 가장 흔한 경우다 — 표의 뼈대를 먼저 만들고 값은 데이터에서 온다.
   */
  split(): Readonly<{ headers: readonly string[]; body: readonly (readonly string[])[] }> {
    const [headers = [], ...body] = this.grid;
    return { headers, body };
  }

  /**
   * 스프레드시트가 마지막에 붙이는 빈 줄 하나만 버린다.
   *
   * 여러 줄을 버리면 사용자가 일부러 비워 둔 행이 사라진다. 표 아래에 빈 줄을 두는
   * 양식이 실제로 있다(미처리내역의 빈 칸).
   */
  private static withoutTrailingBlank(
    rows: readonly (readonly string[])[],
  ): readonly (readonly string[])[] {
    const last = rows[rows.length - 1];
    const isBlank = last !== undefined && last.length === 1 && last[0] === "";
    return isBlank ? rows.slice(0, -1) : rows;
  }

  /** 짧은 행을 빈 칸으로 채워 모든 행의 열 수를 같게 만든다. */
  private static padded(
    rows: readonly (readonly string[])[],
  ): readonly (readonly string[])[] {
    const width = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
    return rows.map((row) => [
      ...row,
      ...Array.from({ length: width - row.length }, () => ""),
    ]);
  }

  /** 인용부호 안의 구분자를 칸 나눔으로 세지 않기 위해 한 글자씩 읽는다. */
  static isQuote(character: string): boolean {
    return character === PastedGrid.QUOTE;
  }

  /** 칸을 나누는 문자인지 알려 준다. */
  static isSeparator(character: string): boolean {
    return character === PastedGrid.CELL_SEPARATOR;
  }
}

/**
 * 붙여넣은 텍스트를 한 글자씩 읽어 행과 칸으로 나눈다.
 *
 * 정규식으로 자르지 않는 이유는 인용부호 안의 줄바꿈과 탭이다. 그 상태를 들고 있어야
 * 같은 문자를 "칸 나눔"과 "칸 안의 글자" 중 무엇으로 볼지 정할 수 있다.
 */
class PastedGridReader {
  private readonly rows: string[][] = [];
  private row: string[] = [];
  private cell = "";
  private quoted = false;
  private index = 0;

  /** 읽을 텍스트를 받는다. 줄바꿈 표기는 읽는 중에 정규화한다. */
  constructor(private readonly text: string) {}

  /** 텍스트 전체를 읽어 행 목록을 만든다. */
  read(): readonly (readonly string[])[] {
    while (this.index < this.text.length) {
      this.consume(this.text[this.index] ?? "");
    }
    this.endRow();
    return this.rows;
  }

  /** 지금 글자를 상태에 따라 해석한다. */
  private consume(character: string): void {
    this.index += 1;
    if (this.quoted) {
      this.consumeQuoted(character);
      return;
    }
    if (PastedGrid.isQuote(character) && this.cell === "") {
      this.quoted = true;
      return;
    }
    if (PastedGrid.isSeparator(character)) {
      this.endCell();
      return;
    }
    if (character === "\r" || character === "\n") {
      this.endLine(character);
      return;
    }
    this.cell += character;
  }

  /**
   * 인용부호 안에서는 구분자도 줄바꿈도 그냥 글자다.
   *
   * 인용부호 두 개가 붙어 나오면 인용부호 한 글자다. 그것으로 감싸기를 끝내는
   * 인용부호와 구별한다.
   */
  private consumeQuoted(character: string): void {
    if (!PastedGrid.isQuote(character)) {
      this.cell += character;
      return;
    }
    if (PastedGrid.isQuote(this.text[this.index] ?? "")) {
      this.cell += character;
      this.index += 1;
      return;
    }
    this.quoted = false;
  }

  /** `\r\n`을 줄바꿈 하나로 센다. */
  private endLine(character: string): void {
    if (character === "\r" && this.text[this.index] === "\n") this.index += 1;
    this.endCell();
    this.endRow();
  }

  /** 지금까지 모은 글자를 한 칸으로 확정한다. */
  private endCell(): void {
    this.row.push(this.cell);
    this.cell = "";
  }

  /** 지금까지 모은 칸을 한 행으로 확정한다. 빈 행은 만들지 않는다. */
  private endRow(): void {
    if (this.cell !== "") this.endCell();
    if (this.row.length === 0) return;
    this.rows.push(this.row);
    this.row = [];
  }
}
