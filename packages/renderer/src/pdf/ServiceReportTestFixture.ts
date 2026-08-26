import {
  Binding,
  BoundTableSource,
  type Element,
  Frame,
  LineElement,
  PageSpec,
  TableColumn,
  TableElement,
  Template,
  TextElement,
  TextStyle,
} from "@report-tool/core";

const INK = "#111111";
const MUTED = "#555555";

/**
 * 실제 월간 서비스 리포트와 같은 모양의 문서를 만든다.
 *
 * 급여명세서는 한 사람당 한 장으로 끝나서 이 제품의 어려운 길을 지나지 않는다.
 * 이 문서는 표지 한 장에 본문이 이어지고, 표 세 개가 서로 다른 폭으로 놓이며,
 * 그중 하나는 건수에 따라 몇 쪽이 될지 발행 전에는 알 수 없다. 쪽마다 쪽 번호가
 * 반복된다. 이 조합이 실제로 발행되는지가 "리포트를 만들 수 있다"의 기준이다.
 */
export function createServiceReportTemplate(): Template {
  return new Template({
    id: "monthly-service-report",
    name: "월간 서비스 리포트",
    version: 1,
    status: "draft",
    page: new PageSpec("A4", "portrait", [15, 15, 15, 15]),
    fonts: ["Pretendard"],
    elements: [...createCoverElements(), ...createBodyElements(), createPageNumber()],
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z",
  });
}

/** 표지 한 장을 만든다. 본문과 달리 가운데 정렬 문구만 놓인다. */
function createCoverElements(): readonly Element[] {
  const center = (size: number, weight: 400 | 700, color = INK): TextStyle => (
    new TextStyle("Pretendard", size, { weight, color, align: "center" })
  );
  return [
    new TextElement(
      "cover-title", new Frame(15, 105, 180, 12), 1, false,
      { kind: "literal", value: "Customer Report" }, center(24, 700),
    ),
    new TextElement(
      "cover-system", new Frame(15, 120, 180, 8), 1, false,
      { kind: "literal", value: "(e-HR System)" }, center(14, 400),
    ),
    new TextElement(
      "cover-customer", new Frame(15, 136, 180, 8), 1, false,
      { kind: "literal", value: "-{{customer.shortName}}-" }, center(12, 400, MUTED),
    ),
    new TextElement(
      "cover-month", new Frame(15, 148, 180, 8), 1, false,
      { kind: "template", value: "{{period.month}}" }, center(12, 400),
    ),
    new TextElement(
      "cover-vendor", new Frame(15, 250, 180, 8), 1, false,
      { kind: "template", value: "{{vendor.name}}" }, center(11, 700),
    ),
  ];
}

/**
 * 통계 두 개와 처리내역을 본문 쪽(두 번째 쪽)에 차례로 놓는다.
 *
 * 표지는 첫 쪽이고 본문은 그다음부터다. 본문 요소를 하나라도 첫 쪽에 두면 표지에
 * 겹쳐 나온다.
 */
function createBodyElements(): readonly Element[] {
  return [
    ...createSection("work", 20, "업무별 통계(당월)"),
    createWorkStatsTable(),
    ...createSection("type", 74, "처리구분별 통계(당월)"),
    createTypeStatsTable(),
    ...createSection("ticket", 128, "처리내역 (상세)"),
    createTicketTable(),
  ].map((element) => element.withPageIndex(1));
}

/**
 * 표 하나에 붙는 제목·기간·구분선을 한 묶음으로 만든다.
 *
 * 세 표가 같은 머리 구조를 쓰므로 한곳에서 만든다. 셋을 따로 적으면 간격이나
 * 글자 크기가 조금씩 어긋나고, 그 차이는 발행본에서만 드러난다.
 */
function createSection(
  key: string,
  topMm: number,
  title: string,
): readonly Element[] {
  return [
    new TextElement(
      `${key}-title`, new Frame(15, topMm, 120, 6), 1, false,
      { kind: "literal", value: title },
      new TextStyle("Pretendard", 11, { weight: 700, color: INK }),
    ),
    new TextElement(
      `${key}-period`, new Frame(105, topMm + 1, 90, 5), 1, false,
      { kind: "template", value: "기간  {{period.start}} ~ {{period.end}}" },
      new TextStyle("Pretendard", 8, { color: MUTED, align: "right" }),
    ),
    new LineElement(
      `${key}-rule`, new Frame(15, topMm + 7, 180, 0), 1, false, "#333333", 0.3,
    ),
  ];
}

/** 상위·하위 업무별 집계를 아홉 열로 보여 준다. */
function createWorkStatsTable(): TableElement {
  const columns = [
    ["upper", "상위업무명", 22, "left"],
    ["lower", "하위업무명", 26, "left"],
    ["requested", "총요청건수", 18, "center"],
    ["ongoing", "처리중건수", 18, "center"],
    ["resolved", "해결건수", 16, "center"],
    ["unresolved", "미해결건수", 18, "center"],
    ["hours", "처리시간(시간/%)", 26, "center"],
    ["rate", "해결률(%)", 18, "center"],
    ["score", "평점", 18, "center"],
  ] as const;
  return statsTable("work-stats", new Frame(15, 29, 180, 40), "workStats", columns);
}

/** 처리 구분별 집계를 여섯 열로 보여 준다. */
function createTypeStatsTable(): TableElement {
  const columns = [
    ["type", "처리구분별", 72, "left"],
    ["count", "처리건수(건/%)", 26, "center"],
    ["resolved", "해결건수", 20, "center"],
    ["hours", "처리시간(시간/%)", 26, "center"],
    ["rate", "해결률(%)", 20, "center"],
    ["score", "평점", 16, "center"],
  ] as const;
  return statsTable("type-stats", new Frame(15, 83, 180, 40), "typeStats", columns);
}

/** 두 통계표가 같은 글자 크기와 행 높이를 쓰게 한다. */
function statsTable(
  id: string,
  frame: Frame,
  arrayPath: string,
  columns: readonly (readonly [string, string, number, "left" | "center"])[],
): TableElement {
  return new TableElement(
    id, frame, 2, false,
    new BoundTableSource(new Binding(arrayPath)),
    columns.map(([key, header, width, align]) => (
      new TableColumn(key, header, `{{row.${key}}}`, width, align, null)
    )),
    6,
    new TextStyle("Pretendard", 7, { weight: 700, color: INK }),
    new TextStyle("Pretendard", 7, { color: INK }),
    true, "clip",
  );
}

/** 요청 한 건이 여러 줄을 차지하는 처리내역 표를 만든다. */
function createTicketTable(): TableElement {
  const columns = [
    ["no", "NO", 8, "center"],
    ["number", "등록번호", 16, "center"],
    ["requester", "요청자\n(처리구분)", 22, "center"],
    ["requestedAt", "요청일", 18, "center"],
    ["request", "요청내용", 48, "left"],
    ["answer", "처리내용", 44, "left"],
    ["hours", "시간", 8, "center"],
    ["closedAt", "완료일", 16, "center"],
  ] as const;
  return new TableElement(
    "tickets", new Frame(15, 137, 180, 145), 2, false,
    new BoundTableSource(new Binding("tickets")),
    columns.map(([key, header, width, align]) => (
      new TableColumn(key, header, `{{row.${key}}}`, width, align, null)
    )),
    6,
    new TextStyle("Pretendard", 6.5, { weight: 700, color: INK }),
    new TextStyle("Pretendard", 6.5, { color: INK }),
    true, "clip",
  );
}

/** 모든 쪽 오른쪽 위에 같은 자리로 나오는 쪽 번호를 만든다. */
function createPageNumber(): TextElement {
  return new TextElement(
    "page-number", new Frame(160, 8, 35, 5), 9, false,
    { kind: "literal", value: "{{page:00}} / {{pages:00}}" },
    new TextStyle("Pretendard", 8, { color: MUTED, align: "right" }),
    false, 0, true,
  );
}

/** 실제 리포트와 같은 분량과 길이를 가진 발행 데이터를 만든다. */
export function createServiceReportData(ticketCount = 23): unknown {
  return {
    customer: { shortName: "인팩" },
    vendor: { name: "(주)이수시스템" },
    period: { month: "2026년 07월", start: "2026.07.01", end: "2026.07.31" },
    workStats: createWorkStats(),
    typeStats: createTypeStats(),
    tickets: createTickets(ticketCount),
  };
}

/** 호스트가 이미 집계해 넘겨주는 업무별 통계다. 합계 행도 데이터에 들어 있다. */
function createWorkStats(): readonly Record<string, string>[] {
  const rows = [
    ["OPTI-HR", "HRI", "2", "0", "2", "0", "5.5", "25.1%", "100.0", "0.0"],
    ["OPTI-HR", "근태관리", "12", "0", "12", "0", "10.2", "46.6%", "100.0", "0.0"],
    ["OPTI-HR", "급여관리", "7", "0", "7", "0", "5.2", "23.7%", "100.0", "0.0"],
    ["OPTI-HR", "시스템관리", "2", "0", "2", "0", "1", "4.6%", "100.0", "0.0"],
    ["합계", "", "23", "0", "23", "0", "21.9", "100%", "100.0", "0.0"],
  ];
  return rows.map((row) => ({
    upper: row[0] ?? "",
    lower: row[1] ?? "",
    requested: row[2] ?? "",
    ongoing: row[3] ?? "",
    resolved: row[4] ?? "",
    unresolved: row[5] ?? "",
    // 원본은 처리시간과 비율을 한 칸에 함께 적는다.
    hours: `${row[6] ?? ""} / ${row[7] ?? ""}`,
    rate: row[8] ?? "",
    score: row[9] ?? "",
  }));
}

/** 호스트가 이미 집계해 넘겨주는 처리 구분별 통계다. */
function createTypeStats(): readonly Record<string, string>[] {
  const rows = [
    ["[e-HR] 데이터 전달 및 수정", "5 / 21.7%", "5", "4 / 18.3%", "100%", "0.0"],
    ["[e-HR] 요청사항 확인 및 안내", "10 / 43.5%", "10", "6.9 / 31.5%", "100%", "0.0"],
    ["[e-HR] 프로그램 기능 개선", "5 / 21.7%", "5", "8.5 / 38.8%", "100%", "0.0"],
    ["[e-HR] 프로그램 오류 수정", "3 / 13.0%", "3", "2.5 / 11.4%", "100%", "0.0"],
    ["합계", "23 / 100.0%", "23", "21.9 / 100%", "100.0%", "0.0"],
  ];
  return rows.map(([type, count, resolved, hours, rate, score]) => ({
    type: type ?? "",
    count: count ?? "",
    resolved: resolved ?? "",
    hours: hours ?? "",
    rate: rate ?? "",
    score: score ?? "",
  }));
}

/**
 * 실제 문의처럼 길이가 제각각인 처리 건을 만든다.
 *
 * 길이를 고르게 만들면 행 높이가 내용을 따라가는지 확인할 수 없다. 실제 리포트에는
 * 한 줄짜리와 스무 줄짜리가 섞여 있다.
 */
function createTickets(count: number): readonly Record<string, string>[] {
  const requests = [
    "연차사용촉진 확인 요청. 연차촉진 신청이 안되는 현상.",
    "안녕하세요 인팩 이피엠 음성공장 관리팀 이경미 책임입니다. (070-7777-4293) "
      + "7/1일자로 급여사업장을 수원사업장 추가를 하였는데 퇴직자 정산에서 계산이 되지 않아 "
      + "이 부분 확인 부탁드리겠습니다. 현재 재직자로 7/31 퇴직 예정자입니다. "
      + "그래도 강제로 귀속시작일, 귀속종료일 넣으면 계산되는걸로 알고 있습니다.",
    "안녕하십니까 인팩 인사팀 김진성 매니저입니다. 반차(오전중복)이라는 근태코드가 "
      + "신설되어, 개인일정등록 및 반차 신청이 가능하게 신청 시간 선택이 가능하도록 조치 "
      + "요청드립니다. 확인 후 회신 부탁드립니다.",
  ];
  const answers = [
    "요청하신 사항 확인 처리하였습니다.",
    "요청하신 사항 확인 되었습니다. 확인결과 해당 대상자에 대해 총급여 합산시 "
      + "사업자등록번호가 선택되어 있지 않아 발생한 현상으로 확인되었습니다. "
      + "사업자등록번호 선택 후 재계산 부탁드립니다. 감사합니다.",
    "요청하신 사항 처리되었습니다. 개인일정등록에 반차(오전중복)를 추가해 두었고, "
      + "신청 시 시간이 선택되도록 함께 수정하였습니다. 감사합니다.",
  ];
  return Array.from({ length: count }, (_value, index) => {
    const day = String((index % 28) + 1).padStart(2, "0");
    return {
      no: String(count - index),
      number: `2026${day}${String(index).padStart(3, "0")}`,
      requester: index % 3 === 0 ? "박진욱\n(유지보수)" : "김진성\n(기능개선)",
      requestedAt: `2026-07-${day}\n09:${String((index * 7) % 60).padStart(2, "0")}:12`,
      request: requests[index % requests.length] ?? "",
      answer: answers[index % answers.length] ?? "",
      hours: index % 4 === 0 ? "0.5" : "1",
      closedAt: `2026-07-${day}\n14:${String((index * 11) % 60).padStart(2, "0")}:03`,
    };
  });
}
