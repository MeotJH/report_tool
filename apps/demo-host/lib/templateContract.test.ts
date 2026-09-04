import {
  Binding, FieldElement, Frame, PageSpec, Template, TemplateVariable, TextStyle,
  type Element,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { TemplateContractReader } from "./templateContract.js";

const reader = new TemplateContractReader();

describe("TemplateContractReader", () => {
  it("문서가 그리는 경로를 요구 목록에 넣는다", () => {
    const contract = reader.read(templateWith(["employee.name"], [
      declared("employee.name", "성명"),
    ]), {});

    expect(contract.entries.map((entry) => entry.path)).toEqual(["employee.name"]);
    expect(contract.entries[0]?.used).toBe(true);
  });

  it("샘플에 값이 없으면 표시한다. 지금 발행하면 빈칸이다", () => {
    const contract = reader.read(templateWith(["netPay"], [declared("netPay", "실지급액")]), {
      employee: { name: "홍길동" },
    });

    expect(contract.entries[0]?.inSample).toBe(false);
  });

  it("샘플에 값이 있으면 표시한다", () => {
    const contract = reader.read(templateWith(["employee.name"], [
      declared("employee.name", "성명"),
    ]), { employee: { name: "홍길동" } });

    expect(contract.entries[0]?.inSample).toBe(true);
  });

  it("선언하지 않았는데 문서가 쓰는 경로도 빠뜨리지 않는다", () => {
    // 이쪽이 더 위험하다. 선언만 있는 것은 지워도 그만이지만, 선언을 빠뜨린
    // 경로는 호스트가 줘야 하는 줄도 모르는 값이다.
    const contract = reader.read(templateWith(["netPay"], []), {});

    expect(contract.entries[0]).toMatchObject({ path: "netPay", declared: false, used: true });
  });

  it("선언만 하고 문서에서 쓰지 않는 것도 보여 준다", () => {
    const contract = reader.read(templateWith([], [declared("employee.email", "메일")]), {});

    expect(contract.entries[0]).toMatchObject({ used: false, declared: true });
  });

  it("민감 표시와 필수 여부를 그대로 옮긴다", () => {
    const contract = reader.read(templateWith(["employee.rrn"], [
      new TemplateVariable("employee.rrn", "주민등록번호", "string", true, { sensitive: true }),
    ]), {});

    expect(contract.entries[0]).toMatchObject({ required: true, sensitive: true });
  });

  it("선언이 없으면 샘플을 보고 종류를 읽는다", () => {
    // 틀린 안내는 없느니만 못하다. 배열인 자리를 `""`라고 알려 주면 백엔드
    // 개발자는 그대로 만들고, 표가 통째로 비어 발행된다.
    const contract = reader.read(templateWith(["payments"], []), {
      payments: [{ name: "기본급", amount: "3,200,000" }],
    });

    expect(contract.entries[0]?.type).toBe("array");
    expect(contract.sample).toEqual({ payments: [{ name: "", amount: "" }] });
  });

  it("선언도 샘플도 없으면 모른다고 말한다", () => {
    // 아무 값이나 찍어 주면 그것이 근거인 줄 안다.
    const contract = reader.read(templateWith(["netPay"], []), {});

    expect(contract.entries[0]?.type).toBe("unknown");
    expect(contract.sample).toEqual({ netPay: null });
  });

  it("붙여넣고 값만 채우면 되는 껍데기를 만든다", () => {
    const contract = reader.read(templateWith(["employee.name", "netPay"], [
      declared("employee.name", "성명"),
      declared("netPay", "실지급액"),
    ]), {});

    expect(contract.sample).toEqual({ employee: { name: "" }, netPay: "" });
  });

  it("배열은 첫 행 모양까지 껍데기에 넣는다", () => {
    const contract = reader.read(templateWith(["payments"], [
      new TemplateVariable("payments", "지급 항목", "array"),
      declared("payments.amount", "금액"),
    ]), {});

    expect(contract.sample).toEqual({ payments: [{ amount: "" }] });
  });

  it("쓰지 않는 선언은 껍데기에 넣지 않는다", () => {
    // 호스트가 줄 필요 없는 값을 요구하면, 진짜 필요한 것과 구분되지 않는다.
    const contract = reader.read(templateWith([], [declared("employee.email", "메일")]), {});

    expect(contract.sample).toEqual({});
  });
});

/** 선언 하나를 만든다. */
function declared(name: string, label: string): TemplateVariable {
  return new TemplateVariable(name, label, "string");
}

/** 주어진 경로를 그리는 필드만 가진 양식을 만든다. */
function templateWith(
  paths: readonly string[],
  variables: readonly TemplateVariable[],
): Template {
  const elements: Element[] = paths.map((path, index) => new FieldElement(
    `field-${index}`, new Frame(0, index * 10, 50, 8), index, false,
    new Binding(path), new TextStyle("Pretendard", 10),
  ));
  return new Template({
    id: "payslip", name: "급여명세서", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements, variables,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  });
}
