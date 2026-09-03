// 템플릿 JSON 하나와 데이터 JSON 하나로 PDF를 만든다.
//
// 편집기도 브라우저도 이 자리에 없다. 담당자가 편집기로 하는 일은 **양식을
// 만드는 것까지**이고, 발행은 이 스크립트가 하는 일이 전부다. 매달 바뀌는 것은
// 데이터 파일 하나뿐이다.
//
//   node apps/poc/service-report/publish.mjs [데이터파일] [나올파일]
//
// 라이브러리는 파일을 직접 읽지 않는다. 글꼴 파일도, 데이터도 호스트가 준다 —
// 여기서는 이 스크립트가 그 호스트 역할을 한다.
import { readFileSync, writeFileSync } from "node:fs";
import { TemplateFactory } from "@report-tool/core";
import { PdfDocumentRenderer } from "@report-tool/renderer";

const HERE = new URL("./", import.meta.url);
const REGULAR_FONT = "C:/Windows/Fonts/malgun.ttf";
const BOLD_FONT = "C:/Windows/Fonts/malgunbd.ttf";

/** 발행본이 임베딩할 글꼴 파일을 공급한다. 호스트가 반드시 해야 하는 일이다. */
class MalgunFontProvider {
  /** 굵기에 맞는 TTF 파일을 바이트로 돌려준다. */
  async load(_family, weight) {
    return new Uint8Array(readFileSync(weight >= 700 ? BOLD_FONT : REGULAR_FONT));
  }
}

/** 인자로 받은 경로를, 없으면 기본 파일을 쓴다. */
function pathArgument(index, fallback) {
  return process.argv[index] ?? new URL(fallback, HERE).pathname.replace(/^\//, "");
}

const dataPath = pathArgument(2, "data.july.json");
const outputPath = pathArgument(3, "service-report.pdf");

const templatePath = process.argv[4] ?? new URL("./template.json", HERE);
const template = TemplateFactory.fromJSON(JSON.parse(readFileSync(templatePath, "utf-8")));
const data = JSON.parse(readFileSync(dataPath, "utf-8"));

const bytes = await new PdfDocumentRenderer(new MalgunFontProvider())
  .render(template, data, "authoritative");
writeFileSync(outputPath, bytes);

console.log(`${template.name} · 요소 ${template.getElements().length}개 · ${dataPath} → ${outputPath}`);
