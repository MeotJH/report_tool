import { describe, expect, it } from "vitest";
import { PastedGrid } from "./PastedGrid.js";

describe("PastedGrid", () => {
  it("탭으로 칸을, 줄바꿈으로 행을 나눈다", () => {
    const grid = PastedGrid.parse("상위업무명\t하위업무명\nOPTI-HR\tHRI");

    expect(grid.rows()).toEqual([
      ["상위업무명", "하위업무명"],
      ["OPTI-HR", "HRI"],
    ]);
  });

  it("윈도우 줄바꿈을 한 줄로 센다", () => {
    expect(PastedGrid.parse("가\t나\r\n다\t라").rowCount()).toBe(2);
  });

  it("스프레드시트가 붙이는 마지막 빈 줄을 버린다", () => {
    expect(PastedGrid.parse("가\t나\r\n").rowCount()).toBe(1);
  });

  it("일부러 비워 둔 칸은 남긴다", () => {
    expect(PastedGrid.parse("가\t\n\t나").rows()).toEqual([["가", ""], ["", "나"]]);
  });

  it("짧은 행을 빈 칸으로 채워 열 수를 맞춘다", () => {
    const grid = PastedGrid.parse("가\t나\t다\n라");

    expect(grid.columnCount()).toBe(3);
    expect(grid.rows()[1]).toEqual(["라", "", ""]);
  });

  it("인용부호로 감싼 칸 안의 줄바꿈을 행 나눔으로 세지 않는다", () => {
    // 원본 리포트의 `등록\n번호` 머리글이 이 모양으로 온다.
    const grid = PastedGrid.parse("NO\t\"등록\n번호\"\t요청자");

    expect(grid.rowCount()).toBe(1);
    expect(grid.rows()[0]).toEqual(["NO", "등록\n번호", "요청자"]);
  });

  it("인용부호로 감싼 칸 안의 탭을 칸 나눔으로 세지 않는다", () => {
    expect(PastedGrid.parse("\"가\t나\"\t다").rows()[0]).toEqual(["가\t나", "다"]);
  });

  it("붙어 나온 인용부호 두 개는 인용부호 한 글자다", () => {
    expect(PastedGrid.parse("\"그는 \"\"안녕\"\"이라 했다\"").rows()[0])
      .toEqual(["그는 \"안녕\"이라 했다"]);
  });

  it("칸 중간의 인용부호는 그냥 글자다", () => {
    expect(PastedGrid.parse("5\"5\t가").rows()[0]).toEqual(["5\"5", "가"]);
  });

  it("첫 줄을 열 이름으로 떼어 낸다", () => {
    const { headers, body } = PastedGrid.parse("구분\t제목\n안내\t점검").split();

    expect(headers).toEqual(["구분", "제목"]);
    expect(body).toEqual([["안내", "점검"]]);
  });

  it("머리글만 복사해 와도 열 이름을 살린다", () => {
    const { headers, body } = PastedGrid.parse("구분\t제목\t내용").split();

    expect(headers).toEqual(["구분", "제목", "내용"]);
    expect(body).toEqual([]);
  });

  it("빈 텍스트로는 표를 만들 것이 없다", () => {
    expect(PastedGrid.parse("").isEmpty()).toBe(true);
    expect(PastedGrid.parse("   \n").isEmpty()).toBe(false);
  });

  it("원본 처리내역의 머리글 여덟 칸을 한 번에 읽는다", () => {
    const pasted = "NO\t\"등록\n번호\"\t\"요청자\n(처리구분)\"\t요청일\t요청내용\t처리내용\t시간\t완료일";

    const grid = PastedGrid.parse(pasted);

    expect(grid.columnCount()).toBe(8);
    expect(grid.rows()[0]?.[2]).toBe("요청자\n(처리구분)");
  });
});
