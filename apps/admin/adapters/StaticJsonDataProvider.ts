import type { DataProvider } from "@report-tool/core";

/** 데모용 가짜 직원 하나다. 임금명세서 픽스처와 같은 키를 쓴다. */
interface DemoEmployee {
  readonly id: string;
  readonly name: string;
  readonly number: string;
  readonly department: string;
  readonly position: string;
  readonly residentNumber: string;
  readonly payments: ReadonlyArray<{ name: string; amount: string }>;
  readonly deductions: ReadonlyArray<{ name: string; amount: string }>;
}

/**
 * DB 대신 고정된 가짜 명단을 데이터 소스로 흉내 낸다.
 *
 * **프로덕션 코드가 아니다.** 실제 서비스에서는 호스트가 자기 급여 DB로 같은
 * 인터페이스를 구현한다.
 *
 * `sample`과 `resolve`를 나눈 이유가 여기서 드러난다. 미리보기는 **아무나 보는
 * 화면**이라 주민등록번호를 가린 채로 준다. 발행은 실제 문서라 가리지 않는다.
 * 한 메서드로 두 일을 하면 어느 쪽 기준으로 가려야 하는지 호출부가 정하게 되고,
 * 그 판단이 한 번만 틀려도 평문 주민번호가 화면에 뜬다.
 */
export class StaticJsonDataProvider implements DataProvider {
  private static readonly EMPLOYEES: readonly DemoEmployee[] = [
    {
      id: "emp-1", name: "홍길동", number: "073542", department: "개발지원팀", position: "팀장",
      residentNumber: "900101-1234567",
      payments: [
        { name: "기본급", amount: "3,200,000" },
        { name: "연장근로수당", amount: "379,728" },
        { name: "식대", amount: "100,000" },
      ],
      deductions: [
        { name: "소득세", amount: "115,530" },
        { name: "국민연금", amount: "177,570" },
      ],
    },
    {
      id: "emp-2", name: "김서연", number: "081204", department: "인사팀", position: "선임",
      residentNumber: "930315-2345678",
      payments: [
        { name: "기본급", amount: "2,900,000" },
        { name: "식대", amount: "100,000" },
      ],
      deductions: [
        { name: "소득세", amount: "92,400" },
        { name: "국민연금", amount: "130,500" },
      ],
    },
    {
      id: "emp-3", name: "박준호", number: "112007", department: "영업팀", position: "사원",
      residentNumber: "980722-1456789",
      payments: [
        { name: "기본급", amount: "2,600,000" },
        { name: "가족수당", amount: "150,000" },
      ],
      deductions: [
        { name: "소득세", amount: "78,000" },
        { name: "고용 보험", amount: "23,400" },
      ],
    },
  ];

  /** 미리보기에 쓸 표본이다. 개인을 알아볼 수 있는 값은 가린다. */
  async sample(_templateId: string): Promise<unknown> {
    const first = StaticJsonDataProvider.EMPLOYEES[0];
    if (first === undefined) throw new Error("데모 명단이 비어 있다");
    return StaticJsonDataProvider.toDocumentData({
      ...first,
      residentNumber: StaticJsonDataProvider.mask(first.residentNumber),
    });
  }

  /** 발행할 실제 데이터다. 가리지 않는다. */
  async resolve(_templateId: string, recipientId: string): Promise<unknown> {
    const found = StaticJsonDataProvider.EMPLOYEES.find((one) => one.id === recipientId);
    if (found === undefined) throw new Error(`수신자를 찾을 수 없다: ${recipientId}`);
    return StaticJsonDataProvider.toDocumentData(found);
  }

  /** 템플릿이 읽는 모양으로 옮긴다. */
  private static toDocumentData(employee: DemoEmployee): unknown {
    return {
      employee: {
        id: employee.id,
        name: employee.name,
        number: employee.number,
        department: employee.department,
        position: employee.position,
        residentNumber: employee.residentNumber,
      },
      payments: employee.payments,
      deductions: employee.deductions,
    };
  }

  /** 앞 여섯 자리와 성별 한 자리만 남긴다. 실제 마스킹 규칙은 호스트가 정한다. */
  private static mask(residentNumber: string): string {
    return `${residentNumber.slice(0, 8)}${"*".repeat(Math.max(0, residentNumber.length - 8))}`;
  }
}
