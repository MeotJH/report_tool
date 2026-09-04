import { describe, expect, it } from "vitest";
import { PreviewSampleFiller } from "./PreviewSampleFiller.js";
import { TemplateVariable } from "./TemplateVariable.js";

/** 예시값을 붙인 선언 하나를 만든다. */
function declared(name: string, sample?: string): TemplateVariable {
  return new TemplateVariable(
    name, name, "string", false, sample === undefined ? {} : { sample },
  );
}

describe("PreviewSampleFiller", () => {
  it("호스트가 준 값이 선언의 예시를 이긴다", () => {
    const filled = PreviewSampleFiller.fill(
      { employee: { name: "홍길동" } },
      [declared("employee.name", "예시이름")],
    ) as { employee: { name: string } };

    expect(filled.employee.name).toBe("홍길동");
  });

  it("호스트에 없는 경로를 선언의 예시로 채운다", () => {
    const filled = PreviewSampleFiller.fill(
      { employee: { name: "홍길동" } },
      [declared("pay.bonus", "1500000")],
    ) as { pay: { bonus: string } };

    expect(filled.pay.bonus).toBe("1500000");
  });

  it("예시를 정하지 않은 선언은 자리를 만들지 않는다", () => {
    // 빈 자리를 만들면 미리보기가 빈칸을 보여 준다. 그것은 "값이 비었다"와
    // 구분되지 않아, 선언만 하고 예시를 안 준 상태를 알 수 없게 만든다.
    const filled = PreviewSampleFiller.fill({}, [declared("pay.bonus")]) as
      Record<string, unknown>;

    expect(Object.keys(filled)).toEqual([]);
  });

  it("호스트가 준 자료를 고치지 않는다", () => {
    const given = { employee: { name: "홍길동" } };

    PreviewSampleFiller.fill(given, [declared("employee.number", "073542")]);

    expect(given).toEqual({ employee: { name: "홍길동" } });
  });

  it("호스트 값이 빈 문자열이면 그것도 호스트가 정한 값이다", () => {
    const filled = PreviewSampleFiller.fill(
      { note: "" },
      [declared("note", "예시 문구")],
    ) as { note: string };

    expect(filled.note).toBe("");
  });

  it("배열이 있는 자리 아래로는 들어가지 않는다", () => {
    // 배열의 몇 번째 행에 넣을지 정할 근거가 없다. 억지로 넣으면 미리보기의
    // 행 수가 발행본과 달라진다.
    const filled = PreviewSampleFiller.fill(
      { payments: [{ name: "기본급" }] },
      [declared("payments.amount", "3200000")],
    ) as { payments: unknown[] };

    expect(filled.payments).toEqual([{ name: "기본급" }]);
  });

  it("호스트가 아무것도 주지 않아도 예시만으로 미리보기를 만든다", () => {
    const filled = PreviewSampleFiller.fill(
      undefined,
      [declared("employee.name", "홍길동"), declared("employee.number", "073542")],
    ) as { employee: { name: string; number: string } };

    expect(filled.employee).toEqual({ name: "홍길동", number: "073542" });
  });
});
