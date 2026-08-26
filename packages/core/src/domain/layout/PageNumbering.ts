/**
 * 문구 안의 쪽 번호 자리를 실제 번호로 채운다.
 *
 * 쪽 번호는 데이터가 아니라 배치의 결과다. 발행할 데이터에는 "이 문서가 몇 쪽인지"가
 * 없고, 그 값은 표가 몇 줄로 흐르는지가 정해진 뒤에야 알 수 있다. 그래서 데이터
 * 치환(`TemplateExpression`)과 섞지 않고 배치가 끝난 뒤 여기서 따로 채운다.
 *
 * 채우는 규칙이 한 곳에 있어야 편집 화면에 보이는 쪽 번호와 발행본의 쪽 번호가
 * 같아진다.
 */
export class PageNumbering {
  /** `{{page}}` `{{page:00}}` 처럼 이름과 자릿수 지정을 함께 읽는다. */
  private static readonly TOKEN = /\{\{\s*(page|pages)(?::(0+))?\s*\}\}/g;

  /**
   * 이 이름이 쪽 번호 자리인지 알려 준다.
   *
   * `{{page}}`는 생김새가 데이터 경로와 같지만 데이터가 아니다. 이 판단이 여기
   * 없으면, 고정 문구에 남은 표현식을 찾는 검사가 쪽 번호까지 잘못 지적한다.
   */
  static isPageToken(name: string): boolean {
    return name === "page" || name === "pages";
  }

  /** 이 쪽이 몇 번째이고 문서가 모두 몇 쪽인지 함께 보관한다. */
  constructor(
    private readonly pageNumber: number,
    private readonly pageCount: number,
  ) {}

  /** 문구에 있는 쪽 번호 자리를 모두 채운 새 문구를 만든다. */
  apply(text: string): string {
    return text.replace(
      PageNumbering.TOKEN,
      (_match, name: string, zeros: string | undefined) => this.format(
        name === "page" ? this.pageNumber : this.pageCount,
        zeros?.length ?? 1,
      ),
    );
  }

  /**
   * 지정한 자릿수에 맞춰 앞을 0으로 채운다. 넘치는 수는 그대로 둔다.
   *
   * 자리가 모자라다고 숫자를 자르면 10쪽짜리 문서의 10쪽이 0쪽이 된다.
   */
  private format(value: number, digits: number): string {
    return String(value).padStart(digits, "0");
  }
}
