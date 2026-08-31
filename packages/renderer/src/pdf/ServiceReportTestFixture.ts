import {
  Binding,
  BoundTableSource,
  type Element,
  ElementFollow,
  Frame,
  PageSpec,
  StaticTableSource,
  TableColumn,
  type TableColumnAlign,
  TableElement,
  TableHeaderCells,
  Template,
  TextElement,
  TextStyle,
} from "@report-tool/core";

const FONT = "MalgunGothic";
const INK = "#000000";

/**
 * 원본은 8pt 글자 한 줄에 14.69pt를 준다. 그 비율을 그대로 쓴다.
 *
 * 원본 도구는 행 높이를 재는 간격(14.69pt)과 실제로 글자를 쌓는 간격(12.03pt)을
 * 따로 쓴다. 우리는 하나로 쓴다 — 둘로 나누면 화면에서 잰 줄과 발행본에 찍히는
 * 줄이 달라지고, 그 차이는 발행본에서만 드러난다.
 */
const LINE_HEIGHT = 1.836;

/** 원본이 칸 테두리와 글자 사이에 두는 여백(1.83pt)이다. */
const CELL_PADDING = 0.70;

/** 원본이 머리글 칸에 까는 연한 파랑이다. */
const HEADER_FILL = "#D9E4F0";

/**
 * 고객사 월간 서비스 리포트를 원본과 같은 자리·같은 값으로 다시 만든다.
 *
 * 좌표는 원본 PDF에서 잰 것이다. 표의 테두리 선 위치를 그대로 mm로 옮겼기 때문에
 * "비슷하게 보인다"가 아니라 "같은 자리에 있다"를 확인할 수 있다. 값도 원본에서
 * 뽑았다 — 지어낸 데이터로는 줄바꿈과 쪽 나눔이 실제와 같은지 알 수 없다.
 *
 * 이 문서 하나가 제품의 어려운 길을 전부 지난다. 표가 쪽을 넘고, 넘은 쪽마다
 * 제목이 따라가고, 표가 끝난 자리에서 다음 구역이 시작하고, 머리글 한 칸이 값
 * 두 칸을 덮는다.
 */
export function createServiceReportTemplate(): Template {
  return new Template({
    id: "monthly-service-report",
    name: "월간 서비스 리포트",
    version: 1,
    status: "draft",
    // 이어지는 쪽의 본문 영역이 원본과 같은 자리에서 시작하고 끝나야 한다.
    page: new PageSpec("A4", "portrait", [11.36, 10.01, 14.95, 10.16]),
    fonts: [FONT],
    elements: [...createCoverElements(), ...createBodyElements(), createPageNumber()],
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  });
}

/** 표지 한 장을 만든다. 본문과 달리 가운데 정렬 문구와 회사 표만 놓인다. */
function createCoverElements(): readonly Element[] {
  return [
    coverText("cover-title", 47.87, 28, "Customer Report", "literal"),
    coverText("cover-system", 59.17, 28, "(e-HR System)", "literal"),
    coverText("cover-customer", 86.67, 21, "-{{customer.shortName}}-", "template"),
    coverText("cover-month", 164.67, 16, "{{period.month}}", "template", 400),
    staticTable(
      "cover-vendor", new Frame(64.98, 187.29, 80.01, 10.02),
      [["vendor", 40.01], ["customer", 40.0]],
      [{ vendor: "{{vendor.name}}", customer: "{{customer.shortName}}" }],
      10.02, 10, "center",
    ),
    staticTable(
      "cover-mark", new Frame(64.98, 197.31, 80.01, 19.97),
      [["left", 40.01], ["right", 40.0]],
      [{ left: "", right: "" }],
      19.97, 10, "center",
    ),
  ].map((element) => element.withPageIndex(0));
}

/**
 * 한 줄이 실제로 차지하는 높이(mm)다.
 *
 * 요소 높이를 눈대중으로 잡으면 글자가 자기 자리를 넘는다. 지금은 편집기가 그것을
 * `문구 1줄이 요소 높이보다 길다`로 잡아 주므로, 처음부터 맞춰 둔다.
 */
function lineHeightMm(sizePt: number): number {
  return Math.ceil(sizePt * LINE_HEIGHT * 25.4 / 72 * 100) / 100;
}

/** 표지 문구가 모두 같은 폭에서 가운데로 모이게 한다. */
function coverText(
  id: string,
  topMm: number,
  size: number,
  value: string,
  kind: "literal" | "template",
  weight: 400 | 700 = 700,
): TextElement {
  return new TextElement(
    id, new Frame(10, topMm, 190, lineHeightMm(size)), 1, false,
    { kind, value },
    new TextStyle(FONT, size, { weight, color: INK, align: "center", lineHeight: LINE_HEIGHT }),
  );
}

/**
 * 본문 한 쪽에 세 구역을 놓고, 처리내역 뒤에 두 구역을 더 매단다.
 *
 * 미처리내역과 기타사항은 처리내역 표가 끝난 자리에서 시작한다. 건수가 달라지면
 * 표의 길이가 달라지므로 절대 좌표로는 놓을 수 없다.
 */
function createBodyElements(): readonly Element[] {
  return [
    ...createWorkSection(),
    ...createTypeSection(),
    ...createTicketSection(),
    ...createUnresolvedSection(),
    ...createOtherSection(),
  ].map((element) => element.withPageIndex(1));
}

/** 업무별 통계: 제목·기간·아홉 머리글이 열 칸을 덮는 표. */
function createWorkSection(): readonly Element[] {
  return [
    sectionTitle("work-title", 11.36, "업무별 통계(당월)"),
    periodCaption(
      "work-period", new Frame(9.98, 19.96, 190.01, 7.51),
      47.45, 142.56, 10, 10, "left", [0],
    ),
    boundTable(
      "work-stats", new Frame(9.98, 29.95, 190.01, 45.08),
      "workStats",
      [
        ["upper", "상위업무명", 20.0, "center", 1],
        ["lower", "하위업무명", 35.0, "center", 1, true],
        ["requested", "총요청건수", 20.0, "center", 1],
        ["ongoing", "처리중건수", 20.0, "center", 1],
        ["resolved", "해결건수", 20.0, "center", 1],
        ["unresolved", "미해결건수", 20.0, "center", 1],
        ["hours", "처리시간(시간/%)", 14.99, "center", 2],
        ["hoursRate", "", 14.99, "center", 1],
        ["rate", "해결률(%)", 15.03, "center", 1],
        ["score", "평점", 9.98, "center", 1],
      ],
      7.51,
    ),
  ];
}

/** 처리구분별 통계: 머리글 두 개가 각각 값 두 칸을 덮는 표. */
function createTypeSection(): readonly Element[] {
  return [
    sectionTitle("type-title", 86.43, "처리구분별 통계(당월)"),
    periodCaption(
      "type-period", new Frame(9.98, 95.07, 190.01, 7.48),
      47.45, 142.56, 10, 10, "left", [0],
    ),
    boundTable(
      "type-stats", new Frame(9.98, 105.02, 190.01, 45.09),
      "typeStats",
      [
        ["type", "처리구분별", 69.99, "left", 1, false, "center"],
        ["count", "처리건수(건/%)", 15.03, "center", 2],
        ["countRate", "", 14.99, "center", 1],
        ["resolved", "해결건수", 20.0, "center", 1],
        ["hours", "처리시간(시간/%)", 14.99, "center", 2],
        ["hoursRate", "", 14.99, "center", 1],
        ["rate", "해결률(%)", 20.0, "center", 1],
        ["score", "평점", 20.0, "center", 1],
      ],
      7.48,
    ),
  ];
}

/**
 * 처리내역: 스물세 건이 여러 쪽으로 이어지는 표.
 *
 * 제목과 기간은 표를 따라간다. 이어지는 쪽에 그 둘이 없으면 어느 칸이 무엇인지
 * 알 수 없다.
 */
function createTicketSection(): readonly Element[] {
  const follow = ElementFollow.caption("tickets");
  return [
    sectionTitle("ticket-title", 161.5, "처리내역 (상세)").withFollows(follow),
    periodCaption(
      "ticket-period", new Frame(10.16, 170.11, 189.83, 7.48),
      54.19, 135.64, 8, 9, "center", [0, 1],
    ).withFollows(follow),
    boundTable(
      "tickets", new Frame(10.16, 177.58, 189.83, 104.4),
      "tickets",
      [
        ["no", "NO", 7.23, "center", 1],
        ["number", "등록\n번호", 14.01, "center", 1],
        ["requester", "요청자\n(처리구분)", 14.99, "center", 1],
        ["requestedAt", "요청일", 17.96, "center", 1],
        ["request", "요청내용", 74.75, "left", 1, false, "center"],
        ["answer", "처리내용", 37.22, "left", 1, false, "center"],
        ["hours", "시간", 7.27, "center", 1],
        ["closedAt", "완료일", 16.4, "center", 1],
      ],
      11.01,
    ),
  ];
}

/** 미처리내역: 건수가 0이라 머리글과 빈 줄만 나오는 표. */
function createUnresolvedSection(): readonly Element[] {
  const follow = ElementFollow.flow("tickets");
  return [
    sectionTitle("unresolved-title", 293.38, "미처리내역 (상세)"),
    periodCaption(
      "unresolved-period",
      new Frame(9.98, 301.98, 190.01, 7.48),
      54.19, 135.82, 8, 9, "center", [0, 1],
    ),
    boundTable(
      "unresolved",
      new Frame(9.98, 309.46, 190.01, 11.01),
      "unresolved",
      [
        ["no", "NO", 7.23, "center", 1],
        ["number", "등록\n번호", 14.01, "center", 1],
        ["requester", "요청자\n(처리구분)", 14.99, "center", 1],
        ["requestedAt", "요청일", 17.96, "center", 1],
        ["request", "요청내용", 112.01, "left", 1, false, "center"],
        ["hours", "시간", 7.27, "center", 1],
        ["closedAt", "완료일", 16.55, "center", 1],
      ],
      11.01,
    ),
    staticTable(
      "unresolved-empty",
      new Frame(9.98, 320.47, 190.01, 11.54),
      [["empty", 190.01]], [{ empty: "" }], 11.54, 8, "center",
    ),
  ].map((element) => element.withFollows(follow));
}

/** 기타사항: 구분·제목·내용 세 칸짜리 빈 표. */
function createOtherSection(): readonly Element[] {
  const follow = ElementFollow.flow("tickets");
  return [
    sectionTitle("other-title", 343.4, "기타사항"),
    boundTable(
      "others",
      new Frame(9.98, 352.01, 190.01, 7.48),
      "others",
      [
        ["kind", "구분", 33.51, "center", 1],
        ["title", "제목", 44.73, "center", 1],
        ["body", "내용", 111.76, "center", 1],
      ],
      7.48,
    ),
    staticTable(
      "other-empty",
      new Frame(9.98, 359.49, 190.01, 7.48),
      [["empty", 190.01]], [{ empty: "" }], 7.48, 8, "center",
    ),
  ].map((element) => element.withFollows(follow));
}

/** 구역 제목은 모두 같은 크기와 굵기를 쓴다. */
function sectionTitle(id: string, topMm: number, text: string): TextElement {
  return new TextElement(
    id, new Frame(10.61, topMm, 120, lineHeightMm(14)), 1, false,
    { kind: "literal", value: text },
    new TextStyle(FONT, 14, { weight: 700, color: INK, lineHeight: LINE_HEIGHT }),
  );
}

/**
 * `기간  시작 ~ 끝` 캡션을 표 모양으로 만든다.
 *
 * 원본에서 이 자리는 문구가 아니라 두 칸짜리 표다. 문구로 만들면 테두리가 없어
 * 나란히 놓인 본표와 따로 노는 것처럼 보인다.
 */
function periodCaption(
  id: string,
  frame: Frame,
  labelWidth: number,
  valueWidth: number,
  labelSize: number,
  valueSize: number,
  valueAlign: TableColumnAlign,
  headerColumns: readonly number[],
): TableElement {
  const table = staticTable(
    id, frame,
    [["label", labelWidth], ["value", valueWidth]],
    [{ label: "기간", value: "{{period.start}} ~ {{period.end}}" }],
    frame.height, labelSize, "center",
  );
  return table
    .withStyles({ cellStyle: cellStyle(valueSize, 400) })
    .withColumns([
      table.columns[0]!,
      new TableColumn("value", "", "{{row.value}}", valueWidth, valueAlign, null),
    ])
    .withHeaderCells(new TableHeaderCells(headerColumns));
}

/** 값이 템플릿에 고정된 표를 만든다. 셀 값의 표현식은 발행 때 채워진다. */
function staticTable(
  id: string,
  frame: Frame,
  columns: readonly (readonly [string, number])[],
  rows: readonly Record<string, string>[],
  rowHeight: number,
  size: number,
  align: TableColumnAlign,
): TableElement {
  return new TableElement(
    id, frame, 2, false,
    new StaticTableSource(rows),
    columns.map(([key, width]) => (
      new TableColumn(key, "", `{{row.${key}}}`, width, align, null)
    )),
    rowHeight,
    cellStyle(size, 700), cellStyle(size, 400),
    false, "clip", false, TableHeaderCells.none(), HEADER_FILL,
    0, false, null, CELL_PADDING,
  );
}

/**
 * 데이터 표의 열 하나를 적는 자리다.
 *
 * 마지막 값은 "이 칸이 비면 앞 칸이 여기까지 덮는가"다. `합계` 행처럼 이름 하나가
 * 두 칸에 걸치는 줄에 쓴다.
 */
type BoundColumn = readonly [
  string, string, number, TableColumnAlign, number, boolean?, TableColumnAlign?,
];

/** 행 수가 발행 데이터로 정해지는 표를 만든다. */
function boundTable(
  id: string,
  frame: Frame,
  arrayPath: string,
  columns: readonly BoundColumn[],
  rowHeight: number,
): TableElement {
  return new TableElement(
    id, frame, 2, false,
    new BoundTableSource(new Binding(arrayPath)),
    columns.map(([key, header, width, align, span, mergesWhenEmpty, headerAlign]) => (
      new TableColumn(
        key, header, `{{row.${key}}}`, width, align, null,
        span, mergesWhenEmpty === true, headerAlign,
      )
    )),
    rowHeight,
    cellStyle(8, 700), cellStyle(8, 400),
    true, "clip", false, TableHeaderCells.none(), HEADER_FILL,
    0, false, null, CELL_PADDING,
  );
}

/** 모든 표가 같은 줄 간격과 세로 가운데 정렬을 쓴다. */
function cellStyle(size: number, weight: 400 | 700): TextStyle {
  return new TextStyle(FONT, size, {
    weight, color: INK, valign: "middle", lineHeight: LINE_HEIGHT,
  });
}

/** 모든 쪽 아래 가운데에 같은 자리로 나오는 쪽 번호를 만든다. */
function createPageNumber(): TextElement {
  return new TextElement(
    "page-number", new Frame(0, 287.36, 210, lineHeightMm(10)), 9, false,
    { kind: "literal", value: "{{page:00}} / {{pages:00}}" },
    new TextStyle(FONT, 10, { color: INK, align: "center", lineHeight: LINE_HEIGHT }),
    false, 0, true,
  );
}

/** 원본과 같은 분량·같은 문장을 가진 발행 데이터를 만든다. */
export function createServiceReportData(ticketCount = 23): unknown {
  return {
    customer: { shortName: "인팩" },
    vendor: { name: "(주)이수시스템" },
    period: { month: "2026년 07월", start: "2026.07.01", end: "2026.07.31" },
    workStats: WORK_STATS,
    typeStats: TYPE_STATS,
    tickets: TICKETS.slice(0, ticketCount),
    unresolved: [],
    others: [],
  };
}

/** 호스트가 이미 집계해 넘겨주는 업무별 통계다. 합계 행도 데이터에 들어 있다. */
const WORK_STATS: readonly Record<string, string>[] = [
    { upper: "OPTI-HR", lower: "HRI", requested: "2", ongoing: "0", resolved: "2", unresolved: "0", hours: "5.5", hoursRate: "25.1%", rate: "100.0", score: "0.0" },
    { upper: "OPTI-HR", lower: "근태관리", requested: "12", ongoing: "0", resolved: "12", unresolved: "0", hours: "10.2", hoursRate: "46.6%", rate: "100.0", score: "0.0" },
    { upper: "OPTI-HR", lower: "급여관리", requested: "7", ongoing: "0", resolved: "7", unresolved: "0", hours: "5.2", hoursRate: "23.7%", rate: "100.0", score: "0.0" },
    { upper: "OPTI-HR", lower: "시스템관리", requested: "2", ongoing: "0", resolved: "2", unresolved: "0", hours: "1", hoursRate: "4.6%", rate: "100.0", score: "0.0" },
    { upper: "합계", lower: "", requested: "23", ongoing: "0", resolved: "23", unresolved: "0", hours: "21.9", hoursRate: "100%", rate: "100.0", score: "0.0" },
];

/** 호스트가 이미 집계해 넘겨주는 처리 구분별 통계다. */
const TYPE_STATS: readonly Record<string, string>[] = [
    { type: "[e-HR] 데이터 전달 및 수정", count: "5", countRate: "21.7%", resolved: "5", hours: "4", hoursRate: "18.3%", rate: "100%", score: "0.0" },
    { type: "[e-HR] 요청사항 확인 및 안내", count: "10", countRate: "43.5%", resolved: "10", hours: "6.9", hoursRate: "31.5%", rate: "100%", score: "0.0" },
    { type: "[e-HR] 프로그램 기능 개선", count: "5", countRate: "21.7%", resolved: "5", hours: "8.5", hoursRate: "38.8%", rate: "100%", score: "0.0" },
    { type: "[e-HR] 프로그램 오류 수정", count: "3", countRate: "13.0%", resolved: "3", hours: "2.5", hoursRate: "11.4%", rate: "100%", score: "0.0" },
    { type: "합계", count: "23", countRate: "100.0%", resolved: "23", hours: "21.9", hoursRate: "100%", rate: "100.0%", score: "0.0" },
];

/** 원본 리포트에 실린 처리 건 스물세 개를 그대로 옮긴 것이다. */
const TICKETS: readonly Record<string, string>[] = [
    {
      no: "23",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-29\n18:09:45",
      request: "안녕하세요 인팩 이피엠 음성공장 관리팀 이경미 책임입니다. (070-7777-4293)7/1일자로 급여사업장을 수원사업장 추가를 하였는데 퇴직자 정산에서 계산이 되지 않아 이부분 확인 부탁드리겠습니다.현재 재직자로 7/31 퇴직 예정자입니다. 그래도 강제로 귀속시작일, 귀속종료일 넣으면 계산되는걸로 알고 있습니다.(대상자 : 민한음20230263)작업일자 : 2026.08.10 퇴직자 정산",
      answer: "요청하신 사항 확인 되었습니다.확인결과 현재 총급여합산시 해당 대상자에 대해서 에러가 발생하고 있으며,원인은 조직 - 기본설정 - 사업장관리에서 수원사업장의사업자등록번호가 세팅되어있지 않아 빈값으로 들어가면서 발생한 에러로 확인 되었습니다.사업장등록번호 세팅 바랍니다.감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-30\n09:37:32",
    },
    {
      no: "22",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-28\n15:18:20",
      request: "",
      answer: "요청하신 사항 확인 되었습니다.1. 권한세팅 방법 확인요청&nbsp; &nbsp;1.1 시스템 - 보안/권한관리 - 권한그룹관리에서 신규 생성 이후어휘적용(복사했을시 초기화필요), 권한범위 세팅&nbsp;&nbsp;1.2 권한그룹프로그램관리 세팅(적용권한 주의필요. 사용자 권한일 경우 사용자들의 권한을 따라가며,프로그램 권한일 경우 사용자권한 무시하고 해당 세팅으로만 갑니다.)&nbsp;&nbsp;1.3 권한그룹사용자관리에서 대상자 세팅(조회구분이 권한범위적용일경우권한범위를 따라갑니다)2.연봉관리 확인 요청&nbsp;&nbsp;- 읽기 권한을 부여시저장 버튼이 사라지게 됩니다. (Sheet 기술로 인하여 문구 수정 여부는 보통 대응이안되어있음)&nbsp; &nbsp;-대상자의 권한 조회구분이권한범위적용일 경우 권한범위 내의 조직 데이터만 출력하도록 되어있는 것으로 확인 되었습니다. 따라서 다른조직의 데이터가 보이는게안된다면 반드시 조회구분을권한범위적용으로 세팅해주시길 바랍니다.감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-28\n15:24:37",
    },
    {
      no: "21",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-28\n14:13:44",
      request: "안녕하십니까. 인팩 이피엠(주) 음성공장 관리팀 박준수 책임매니저 입니다. (hp 010-2332-7528, tel. 070-7777-4959)아래 사진과 같이 전일 야간근로자의 퇴근이 다음날퇴근시간에 로드 되어 문의 드립니다.",
      answer: "요청하신 사항 확인 되었습니다.확인결과 해당 대상자의 데이터가 근무일이 27일로 넘어와야 하나, 28일로 넘어왔습니다.7월 24일에 이해남님 케이스로 보았을때 퇴근이 다음날이 되더라도 근무일 자체는 출근일와 같이넘어와야하지만 해당 데이터의 경우 27일 출근, 28일 퇴근 데이터로 넘어와서 발생한 문제로 확인 되었습니다.캡스측에 해당 데이터를27일로 요청 해주셔야 할 것같습니다.감사합니다.",
      hours: "1",
      closedAt: "2026-07-28\n15:34:25",
    },
    {
      no: "20",
      number: "",
      requester: "박진욱\n(개발사항)",
      requestedAt: "2026-07-24\n14:26:57",
      request: "안녕하세요 인팩 이피엠 음성공장 이경미 책임입니다.(070-7777-4293)퇴직금 계산서 상에 상여/연차 내역을 →성과평가급/연차 내역으로, 상여 → 성과평가급으로 변경부탁드리며,현재 성과평가급 1년치가 특별상여 쪽에 보여지고 있어서 이부분도 윗칸인 성과평가급칸으로 보여지게끔 변경 부탁드리겠습니다.",
      answer: "요청하신 사항 처리되었습니다.어제 변경해두었던 양식롤백 해두었으며, 롤백 본에서 성과평가급/연차내역, 성과평가급으로 문구 수정하였습니다.그리고 성과평가급 쪽에 급여코드 정기상여,성과평가급이 매칭 되도록하였으며, 특별상여에서는성과평가급이 나오지 않도록하였습니다.확인 후 문제가없으신걸로 답변 받았습니다.감사합니다.",
      hours: "0.3",
      closedAt: "2026-07-24\n14:38:04",
    },
    {
      no: "19",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-24\n09:28:22",
      request: "안녕하세요 인팩 이피엠 음성공장 이경미 책임입니다.(070-7777-4293)연말정산_2022년도분을 열고 싶은데 사용여부에 체크해두었는데도 항목이 열리지 않아 문의 드립니다.",
      answer: "요청하신 사항 확인 되었습니다.이경미 책님임은 공장장 권한이 없는 것으로 보입니다.&nbsp;해당 화면에서보고싶으신 권한으로 변경후 세팅 해주셔야 합니다.감사합니다.",
      hours: "0.2",
      closedAt: "2026-07-24\n09:40:02",
    },
    {
      no: "18",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-24\n09:17:07",
      request: "안녕하십니까 인팩 인사팀 이현수 매니저(02-6714-5523,010-3871-9716)입니다.반반차(휴일중복)이라는 근태코드가 신설됨에 따라,근태일괄업로드 탭 內 반반차 신청과 동일하게 신청 시간 선택 가능하도록 조치 요청드립니다.추가적으로, 연차관리 - 연차휴가계획신청 탭 內 연차휴가계획을 신청하는 경우에도,반반차 선택 시에는 신청 시간 선택 가능하도록 부탁드립니다.▶ 연차휴가계획승인 및 연차휴가계획관리에서도 이상없이 보이는지 확인 必감사합니다.",
      answer: "요청하신 사항 처리되었습니다.근태일괄엽로드에 반반차(휴일중복)에 대해서 추가해두었으며, 연차휴가계획신청에 반반차 선택시 시간을 선택하도록 추가 하였습니다.추가로 반반차일때만 활성화, 시간 없이 저장시 팝업뜨도록 개선 하였습니다.감사합니다.",
      hours: "3",
      closedAt: "2026-07-27\n17:34:30",
    },
    {
      no: "17",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-24\n09:12:56",
      request: "안녕하세요 기술관리팀 임형록입니다단축근무 변경 시 기결재문서를 임시저장으로 변경 후 신청자가 수정하여 재신청하는 절차로 진행하고 있습니다단축근무 시간 변경시 기존 단축근무 데이터 앞 삭제 체크박스 체크하고 변경내용 입력 후 신청하는데요최근 어떤 직원분께서 실수로삭제를 안하고 신청하셨는데 신청이 되어 처리가 되었습니다(기존 단축근무 2시간, 변경 단축근무 2시간 중복 입력)해당 화면은 첨부드리오니 확인 부탁드립니다임형록책임 010-3202-4181",
      answer: "요청하신 사항 처리되었습니다.해당 로직 처리 당시 삭제시간은 체크가 안되도록 로직을 구성 하였습니다. 그렇다 보니 삭제시 에러가 발생하면 화면에서는 통과되고,실제 데이터는 삭제되지 않는 경우가 있을수 있습니다.하지만 삭제하시진 않았다고 하여 해당 조건으로 확인해보았으나, 제가 테스트한모든 조건에서는 전부 로직이 걸려 신청이 불가능하게되었습니다.추후 동일한 케이스가 발생할 경우 해당 입력 방법에 대해 말씀해주시면 동일하게 작업을 진행해서 테스트를 진행해보겠습니다. 현재로서는 어떤 방식으로 입력하신지 확인이 되지않습니다.도홍국님의 신청데이터는 유선으로 말씀해주신대로 7월 24일만 남기고 결재선 유지한 채로 처리완료로 변경 해두었습니다.감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-28\n10:48:21",
    },
    {
      no: "16",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-23\n09:03:55",
      request: "안녕하세요 인팩 이피엠 음성공장 이경미 책임입니다.(070-7777-4293)현재 급여사업장 설정이 인팩 이피엠의경우 음성, 제천, 수원, CKD 4개가 있는데 지금 현재 쓰고있는건 음성, 제천만 쓰고 있습니다.근데 수원사업장도 설정을 하고자 하는데 조직조직구분조직구분등록에서 급여기준사업장을 변경하면 되는 부분이 아닌가요? 현재 나뉘어 나오지 않아 확인이 필요합니다. 7월 하계휴가비분부터바로 적용하려고 하는데 확인 부탁드릴게요~!(* 배터리설계실, 구동부품설계팀, 배터리부품설계1팀)",
      answer: "요청하신 사항 확인 되었습니다.급여기준상버장의 경우말씀해주신대로 조직 - 조직구분 - 조직구분등록에서 각조직마다 급여기준사업장을세팅해주시면 됩니다.하지만세팅 이후 반드시 급여대상자 재생성을 해주셔야 합니다. 급여 계산시 사용되는 급여기준사업장은 급여대상자생성때 조직구분에 맞춰서등록이 되기 때문에 급여기준사업장 변경 후 급여대상자를 재생성하지 않으면 이전 사업장으로 잡혀있을 것으로 예상 됩니다.추가로 조직구분예외사항의 경우 각조직별 특별하게 다른 사업장으로 받으시는 분들을 세팅하는 경우가 많으며, 조직구분등록보다 우선시되기 때문에 특별하게 예외처리할인원이 있으실 경우 등록하시면 됩니다.물론 이 경우에도 급여대상자 재생성은 해주셔야 합니다.만약 그럼에도 불과하고 집계가 안되실경우 문의 주시면 확인 도와드리겠습니다.감사합니다.\n",
      hours: "0.2",
      closedAt: "2026-07-23\n09:47:00",
    },
    {
      no: "15",
      number: "",
      requester: "박진욱\n(개발사항)",
      requestedAt: "2026-07-22\n14:07:13",
      request: "안녕하십니까. 인팩 일렉스 관리팀 오정은 책임입니다.(070-4900-2511 / 010-7456-6130)퇴직금 계산서 출력 시문구 변경 및 항목 추가 요청드립니다.1. 평균임금 산정내역에서 '급여내역' 상 성과평가급(INFAC Way 인센티브) 계산은 포함되어 있지만,항목이 따로 표기되어있지는 않고있습니다.가능하다면, 총계(B) 위에 '성과평과급' 으로 항목추가 부탁드립니다.2. '상여/연차 내역' 성과평가급은 기존대로 '정기상여'로 변경 부탁드립니다.관련 문의사항은 연락 부탁드리겠습니다.감사합니다.",
      answer: "요청하신 사항 처리되었습니다.말씀해주신 내용대로 수정 하였으나, 이후 다시 검토하신다고 하였습니다.검토후 연락 주시기로 하였으나아직까지 연락을 받지 못하여 해당 문의 글은 완료 처리 하겠습니다.이후 작업이필요하실때 변경되는 내용으로 다시 올려주시면 작업 진행하겠습니다.감사합니다.\n",
      hours: "2",
      closedAt: "2026-07-31\n13:26:02",
    },
    {
      no: "14",
      number: "",
      requester: "김별\n(유지보수)",
      requestedAt: "2026-07-20\n10:38:30",
      request: "안녕하십니까인팩 이피엠(주) 음성공장 관리팀 김별 매니저 입니다.사번 :20260159 / 권오훈 책임 (2026-07-20 발령) 이였는데, 입사예정일이 2026-08-10 로 바뀐 상태입니다.신상명세를 인사기본에 다 등록해놓은 상황이라, 모든내용들은 삭제하지 않고, 입사일만 변경 가능한지 문의드립니다.[현 상태]",
      answer: "요청하신 사항 처리되었습니다.입사 발령시 연계되는 입사일과 관련된 데이터들은전부 2026년 8월 10일로 수정 하였습니다.그에 따라 소속 정보 역시 8월 9일까지는재직전, 8월 10일부터 입사로 수정 하였습니다.그 외에수기로 입력하신 데이터에대해서는 따로 수정이 필요하실 것으로 보입니다.감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-20\n14:25:21",
    },
    {
      no: "13",
      number: "",
      requester: "박진욱\n(개발사항)",
      requestedAt: "2026-07-14\n10:02:28",
      request: "안녕하세요 인팩 이피엠 음성공장 이경미 책임입니다.(070-7777-4293)1. 대상자 : 한진웅 (20160317) 확정 처리를 했는데도 불구하고 현재 확정여부가 N으로 표기 되며,휴가계획등록상에 있는 내역도 근태신청에 일부만 넘어와있습니다.2. 일부 인원들이 반반차, 반차에 대한 적용일수가 제대로 카운트되어 넘어오지 않아 수기로 연월차내역관리에서 수정을 해야하는 상황인데카운트가 잘 되어 넘어가는건지 같이 확인 부탁드립니다.",
      answer: "요청하신 사항 처리되었습니다.확인결과 1번의 경우 연차휴가계획관리에서 입력 저장 하실때 근태 종류 기능이없어서 빈값으로 들어가 에러를 일으킨 것으로 확인 되었습니다. 대상자의 건은 직접 세팅 해보면서 데이터 확정 처리 해두었습니다.연차휴가계획관리에서 입력할 경우 근태종류를 세팅하도록하였으며, 반차 반반차 등 추가 해두었습니다.2번의 경우확인결과 반려된 건으로 관리 화면에서 처리완료와 상관없이 모든 데이터가 나오는 것으로 확인되어 처리 완료 데이터만 나오는 것으로수정 하였습니다.감사합니다.",
      hours: "1",
      closedAt: "2026-07-14\n11:36:03",
    },
    {
      no: "12",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-10\n16:34:10",
      request: "심재원님께서 요청 주신 내용으로 자세한 내용은 메일로전달 주셨습니다.",
      answer: "요청하신 사항 처리되었습니다.메일로 답변 드리겠습니다.감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-10\n16:34:46",
    },
    {
      no: "11",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-08\n12:02:07",
      request: "안녕하십니까. 인팩 이피엠(주) 음성공장 관리팀 박준수 책임매니저 입니다. (HP 010-2332-7528, TEL 070-7777-4959)추가적으로 문의 사항이 있습니다.1. 근태종류는 어디에서 코드를 가져 오는 것인지2. 하계휴가는 왜 종료일자 입력칸이 활성화 되지 않는지 문의드립니다.하계휴가를선택하는 경우 종료일자는 입력하라고 팝업되지만 실제로는 입력칸이 활성화 되지 않아서 문의드립니다.",
      answer: "요청하신 사항 처리되었습니다.확인결과 근태종류의 경우 하드코딩을 통해 해당 화면에서 강제로 문제로 입력한 케이스 입니다.휴계휴가시&nbsp; 종료일 선택 못하는 부분은 이전에 반차 반반차가 추가 되면서 해당 데이터들이 종료일자를 수정하면안되기 때문에 추가된 로직으로 인한 문제로 확인 되었습니다.개선하여 연차와하계휴가 선택 시에는 종료일자를 수정할수있도록 하였습니다.감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-08\n14:35:03",
    },
    {
      no: "10",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-08\n10:14:22",
      request: "안녕하십니까. 인팩 이피엠(주) 음성공장 관리팀 박준수 책임매니저 입니다. (HP 010-2332-7528, TEL 070-7777-4959)1년 미만 근로자의 경우 하계휴가 기간을 연차(계획연차)로 처리하고 있습니다.이 경우 아래 이미지와 같이 적용일이 0일로 처리되고 있어 확인 부탁드립니다.",
      answer: "요청하신 사항 확인 되었습니다.확인결과 적용일수를구하는 로직에서는 예외처리가 없는 것으로 보이며, 말씀하신 방식대로 하는 방법은근태코드관리에서 휴일포함여부를 신청 당시에만 체크하시거나 휴일관리에서 데이터를 삭제하는 방식&nbsp;밖에 없는 것으로 보입니다.하지만 두 데이터의 최종 작업일자가 예전으로 되어있는걸로 봐서는 수정되진 않았던 것으로 보이며, 현재 신청할때 적용일수를 수기로 수정이 가능한데 아마 수기로수정하신게 아닐까 생각 됩니다.(아마 최초에 휴일 체크를 못하다 보니 수기로 수정가능하도록 푼게 아닐까 추측 됩니다.)따라서 신청 당시에 수기로 수정 해주시면 될것으로 보입니다.감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-08\n11:07:20",
    },
    {
      no: "9",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-07\n17:12:44",
      request: "안녕하십니까 인팩 인사팀 이현수 매니저(02-6714-5523,010-3871-9716)입니다.급여 - 퇴직금 - 퇴직금결과 - 퇴직추계액결과 탭에서 퇴직추계 산정 시연차평균, 근속지급율, 퇴직추계액 산정 로직에 ROUND인지 ROUNDUP인지 문의 드립니다.확인하실 때 가능하시다면 퇴직금 결과에서도근속지급율 및 일 평균임금 ROUND인지 ROUNDUP 확인부탁드립니다.감사합니다.",
      answer: "요청하신 사항 확인 되었습니다.연차평균의 경우 3개월연차액을 사용하고 있으며,&nbsp; 3개월연차액의 경우현재 퇴직금항목관리에 절상으로 되어있습니다.근속지급율의 경우 해당 화면에 데이터 뿌려줄때 절상 처리를 하고 있습니다.퇴직추계액의경우 급여기타기준의SEP_R01, SEP_R02 설정을사용하는 것으로 보이며, 절사처리가 되어있는 것으로보입니다.감사합니다.",
      hours: "",
      closedAt: "2026-07-07\n17:27:33",
    },
    {
      no: "8",
      number: "",
      requester: "박진욱\n(개발사항)",
      requestedAt: "2026-07-06\n14:53:38",
      request: "안녕하십니까 인팩 인사팀 이현수 매니저(02-6714-5523,010-3871-9716)입니다.E-HR 홈페이지에 접속했을 시, 계약직 인원의 계약 종료 예정일이 도래했을 때 보일 수 있도록 하고자 합니다.위젯 형태로 생성 부탁드리며 계약직인원의 계약 종료 예정일이 7일 이내로 남았을 때,화면에는 인원 수 및 세부내역을 볼 수 있는 팝업이 뜨도록 요청드리며, 팝업에는 사번, 성명, 그룹입사일, 계약종료예정일이 나오도록 부탁드립니다.추가적으로, 채용발령 시 채용발령내용등록에서 계약직을 입력하는 경우 계약종료예정일이 입력 가능하도록 부탁드리며 계약직인 경우에만 활성화 부탁드립니다.계약종료예정일의 수정은 인사기본에서 가능하도록 조치 부탁드립니다.감사합니다.",
      answer: "요청하신 사항 처리되었습니다.계약종료예정일은 이력용으로 관리하시는게 아니라고하셔서 인사기본의 내용으로추천 드렸습니다.채용발령내용 등록시 계약직으로 선택한 경우 계약종료예정일이 활성화 되어 선택할수 있으며, 이후 입사 발령때 해당 내용이 인사기본에적용이 되어 계약종료예정일로 들어가게 됩니다.인사기본에도 계약종료예정일을 추가 하였으며, 수정이 가능 합니다.홈 화면에 계약종료예정자 위젯을 추가 하여 건수로 조회가 가능하게끔 하였습니다.1건 우측에 문서 이미지를 넣어 클릭시 팝업이열리며 해당하는 대상자를조회할수 있습니다.유선으로합의하여 HR 마스터 권한에부여 해두었으며, 필요하실경우 위젯관리 쪽에서 권한에 등록하시면 됩니다.감사합니다.",
      hours: "5",
      closedAt: "2026-07-08\n17:38:35",
    },
    {
      no: "7",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-06\n14:25:45",
      request: "안녕하십니까 인팩 인사팀 이현수 매니저(02-6714-5523,010-3871-9716)입니다.현재 사간파견 근로자들이 원소속사에서 근태신청을 하는 경우 불가능하다는 팝업이 뜨며제한되고 있습니다.해당 로직과 파업화면과 동일하게, 사간파견 근로자들이 원소속사에서 신청 시(임직원 공통)근태에 있는 근태신청 / 근태취소신청 / 시차출퇴근제 신청 /탄력근무제 신청 / 연장근로신청 / 연차휴가계획신청 / 출장신청이불가능하도록 조치 부탁드립니다.감사합니다.",
      answer: "요청하신 사항 처리되었습니다.확인결과 신청결재 - 신청결재관리 - 신청서코드관리화면에서 우측 끝에 원소속신청으로 로직이 구현되어있는 것으로 확인 되었습니다.필요하신 신청서에 D를넣으실 경우 \"해당 결재문서느 파견사로 로그인하여 신청하세요.\" 가 나오며, Y로입력할 경우 \"해당 결재문서는 원소속회사로 로그인하여신청하세요.\" 가 나오게 됩니다.말씀해주신 신청서들만전 계열사에 입력 해두었습니다.감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-07\n10:32:01",
    },
    {
      no: "6",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-02\n10:59:38",
      request: "안녕하세요 기술관리팀 임형록입니다수원사업장 직원분께서 탄력근로 기준일이 변경되지 않는 에러가 발생하여문의드립니다대상자는 김태형 책임매니저(20230480)입니다과거 5월 28일에 2주로 사용 후(6월 10일 종료) 신청하려고 하면 기준일이 새로 나오지 않고 5/28~6/10으로 나옵니다캡쳐화면 첨부드리오니 확인 부탁드립니다임형록책임 010-3202-4181",
      answer: "요청하신 사항 처리되었습니다.확인결과 5월 28일의 데이터가 3개월로 구분 값이들어가 8월 19일까지 영향을끼치는 것으로 확인 되었습니다.확인하여 데이터를 2주로 수정 하였습니다.(화면에서 보이는 3개월의 경우 이전 데이터에 영향을 받아3개월로 보입니다.)감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-02\n14:19:11",
    },
    {
      no: "5",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-01\n17:41:06",
      request: "안녕하세요 인팩 이피엠 관리팀 이경미 책임 입니다. (070-7777-4293)현재 작업일자 : 2026.07.10 퇴직자 정산시 대상자 기준에 퇴직자들 입력을 하고 저장을 하면 불러와지지 않는 현상이 발생되는데 확인 부탁드리겠습니다.대상자: 송예진 (20230007), 권용수 (20200180), 박용관(20250152)",
      answer: "요청하신 사항 처리되었습니다.확인결과 해당 대상자들은 퇴직정산에 대상자가 등록되어있어 중복 오류로 등록이 안되는 것으로 확인 되었습니다.유선으로 안내드려퇴직정산에서 지우고 정상적으로 들어가시는 것을 확인받았습니다.추가로 대상자생성 로직의 경우 확인해보니 대상자를 집계하는 로직에 사원구분이 이상한 데이터로 들어가있어 이에 해당하는 인원들이 아무도 없어서 집계가 안되는 것으로 확인 되었습니다.다른분이 전화를 받으셔서 유선으로 합의하여 정규직, 계약직, 임원이 대상자로 포함이 되게끔수정 하였습니다.추후 문제가 있으실 경우 문의 부탁드립니다.감사합니다.",
      hours: "2",
      closedAt: "2026-07-02\n13:48:38",
    },
    {
      no: "4",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-01\n17:10:15",
      request: "안녕하십니까 인팩 인사팀 이현수 매니저(02-6714-5523,010-3871-9716)입니다.결재할문서 內 접수되는 휴가계획신청은 몇몇 건이 기안자 등이 공백으로 접수되고 있습니다.해당 건 조치 부탁드립니다.감사합니다.",
      answer: "요청하신 사항 처리되었습니다.확인결과 연차휴가계획신청 화면에서 조회시 기안자정보를 넘겨주지 않아 이미신청된 데이터를 세부내역을통해 다시 연 다음, 임시저장-&gt; 다시 신청 할 경우 기안자 정보가 들어가지 않는현상으로 확인 되었습니다.기안자 정보를 넘겨주도록수정하여 다시 임시저장을하시고 신청 하셔도 기안자정보가 유지되도록 수정 하였습니다.감사합니다.\n",
      hours: "0.5",
      closedAt: "2026-07-01\n17:23:04",
    },
    {
      no: "3",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-01\n16:35:07",
      request: "안녕하십니까 인팩 인사팀 이현수 매니저(02-6714-5523,010-3871-9716)입니다.근태 - 근태관리 - 시차출퇴근제 신청 탭 內 시차출퇴근제 신청 시결재할 문서에서 결재하는경우 근무시간이 조정되는 로직이 미작동되고 있습니다.(시차출퇴근제 승인에서 강제로 처리완료 시 로직 작동)해당 내용 조치 부탁드립니다.감사합니다.",
      answer: "요청하신 사항 처리되었습니다.확인결과 결재할 문서에서 결재할 경우 후속 프로시저가 작동하지 않는 것으로확인 되었습니다.결재할 문서에서 결재 하여도 후속 프로시저 체크 되어있는 신청서는 후속 프로시저가 작동하게끔 수정 하였습니다.감사합니다.",
      hours: "1.5",
      closedAt: "2026-07-01\n17:33:42",
    },
    {
      no: "2",
      number: "",
      requester: "박진욱\n(유지보수)",
      requestedAt: "2026-07-01\n15:37:35",
      request: "시차출퇴근제 확인 요청. 연장근로 신청이 안되는 현상.",
      answer: "요청하신 사항 확인 처리되었습니다.시차출퇴근제라 하여도 해당 대상자의 근무시간은 여전히 8시 30분으로확인 되었습니다.유선으로합의하여 근무조를 생성하는게 아닌, 시차출퇴근제 대상자들은 근무시간조정관리에서 근무시간을 수정하기로하였습니다.감사합니다.",
      hours: "0.5",
      closedAt: "2026-07-01\n15:39:03",
    },
    {
      no: "1",
      number: "",
      requester: "박진욱\n(개발사항)",
      requestedAt: "2026-07-01\n11:18:24",
      request: "안녕하십니까 인팩 인사팀 이현수 매니저(02-6714-5523,010-3871-9716)입니다.현재 연차휴가계획 신청 및 승인시 정렬값이 없어 따로 정렬하지 않으면 산발적으로 일자가 나오고 있습니다.시작일자 기준으로 낮은 일자부터 나오도록 조치 부탁드리며, 신청 및 승인 등에서도 적용되도록 부탁드립니다.감사합니다.",
      answer: "요청하신 사항 처리되었습니다.세부내역의 로직을 낮은날짜부터 정렬이 되도록 수정 하였습니다.감사합니다.",
      hours: "0.2",
      closedAt: "2026-07-01\n11:24:52",
    },
];
