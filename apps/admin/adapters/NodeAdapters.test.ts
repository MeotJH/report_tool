import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FileSystemStorageAdapter } from "./FileSystemStorageAdapter.js";
import { StaticJsonDataProvider } from "./StaticJsonDataProvider.js";

describe("FileSystemStorageAdapter", () => {
  let root = "";

  beforeAll(async () => { root = await mkdtemp(join(tmpdir(), "report-tool-")); });
  afterAll(async () => { await rm(root, { recursive: true, force: true }); });

  it("넣은 바이트를 그대로 꺼낸다", async () => {
    const storage = new FileSystemStorageAdapter(root);
    const bytes = new Uint8Array([37, 80, 68, 70]);

    await storage.put("documents/a/b.pdf", bytes, "application/pdf");

    expect([...(await storage.get("documents/a/b.pdf"))]).toEqual([...bytes]);
  });

  it("없던 폴더를 알아서 만든다", async () => {
    const storage = new FileSystemStorageAdapter(root);

    await storage.put("깊은/폴더/문서.pdf", new Uint8Array([1]), "application/pdf");

    expect((await readFile(join(root, "깊은/폴더/문서.pdf"))).length).toBe(1);
  });

  it("없는 열쇠는 이유를 말한다", async () => {
    await expect(new FileSystemStorageAdapter(root).get("없는것.pdf"))
      .rejects.toThrow("저장소에서 찾을 수 없다: 없는것.pdf");
  });

  it("보관소 밖으로 나가는 열쇠는 거절한다", async () => {
    await expect(new FileSystemStorageAdapter(root).get("../../비밀.txt"))
      .rejects.toThrow("보관소 밖을 가리키는 열쇠다");
  });
});

describe("StaticJsonDataProvider", () => {
  it("미리보기 표본은 주민등록번호를 가린다", async () => {
    const sample = await new StaticJsonDataProvider().sample("payslip") as {
      employee: { residentNumber: string };
    };

    expect(sample.employee.residentNumber).toMatch(/\*{5,}/);
  });

  it("발행 데이터는 가리지 않는다. 실제 문서이기 때문이다", async () => {
    const data = await new StaticJsonDataProvider().resolve("payslip", "emp-1") as {
      employee: { residentNumber: string };
    };

    expect(data.employee.residentNumber).not.toContain("*");
  });

  it("사원번호로 그 사람을 찾는다", async () => {
    const data = await new StaticJsonDataProvider().resolve("payslip", "emp-2") as {
      employee: { id: string };
    };

    expect(data.employee.id).toBe("emp-2");
  });

  it("없는 수신자는 이유를 말한다", async () => {
    await expect(new StaticJsonDataProvider().resolve("payslip", "없음"))
      .rejects.toThrow("수신자를 찾을 수 없다: 없음");
  });
});

