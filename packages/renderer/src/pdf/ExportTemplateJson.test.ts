import { writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import {
  createServiceReportData,
  createServiceReportTemplate,
} from "./ServiceReportTestFixture";

const TEMPLATE_PATH = "apps/poc/service-report/template.json";
const DATA_PATH = "apps/poc/service-report/data.july.json";

/**
 * 완성된 월간 리포트 양식을 **파일 두 개**로 꺼낸다.
 *
 * 발행은 `템플릿 + 데이터 → PDF`다. 템플릿은 한 번 만들고 매달 재사용하고,
 * 데이터만 갈아 끼운다. 그 관계가 코드 안에만 있으면 매달 데이터를 바꾸려면
 * 개발자를 불러야 한다. 파일로 꺼내 두면 데이터 파일만 바꿔 다시 발행한다.
 */
describe("양식과 데이터를 파일로 꺼내기", () => {
  it("템플릿과 7월 데이터를 JSON으로 저장한다", () => {
    writeFileSync(
      TEMPLATE_PATH,
      `${JSON.stringify(createServiceReportTemplate().toJSON(), null, 2)}\n`,
      "utf-8",
    );
    writeFileSync(
      DATA_PATH,
      `${JSON.stringify(createServiceReportData(), null, 2)}\n`,
      "utf-8",
    );
  });
});
