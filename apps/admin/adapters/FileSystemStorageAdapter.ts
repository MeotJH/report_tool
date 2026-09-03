import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { StorageAdapter } from "@report-tool/core";

/**
 * S3 대신 로컬 디스크에 PDF를 두는 참조 구현이다.
 *
 * **프로덕션 코드가 아니다.** 실제 서비스에서는 호스트가 S3·사내 스토리지로 같은
 * 인터페이스를 구현한다. Node API를 쓰는 것은 괜찮다 — 이것은 `infrastructure`이고
 * `domain`이 아니다.
 *
 * 열쇠(key)는 라이브러리가 만들지만(`documents/<템플릿>/<수신자>/<시각>.pdf`),
 * **여기서 다시 확인한다.** 열쇠가 언젠가 바깥 입력에서 오게 되면 `../`로 보관소
 * 밖 파일을 읽거나 덮어쓸 수 있다. 그 사고는 조용히 일어난다.
 */
export class FileSystemStorageAdapter implements StorageAdapter {
  /** 모든 파일이 이 폴더 아래에만 놓인다. */
  constructor(private readonly rootDir: string) {}

  /** 중간 폴더까지 만들고 바이트를 쓴다. */
  async put(key: string, bytes: Uint8Array, _contentType: string): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }

  /** 저장한 바이트를 그대로 읽는다. 없으면 무엇을 못 찾았는지 말한다. */
  async get(key: string): Promise<Uint8Array> {
    try {
      return new Uint8Array(await readFile(this.pathFor(key)));
    } catch (error) {
      if (error instanceof Error && error.message.includes("보관소 밖")) throw error;
      throw new Error(`저장소에서 찾을 수 없다: ${key}`);
    }
  }

  /** 열쇠가 보관소 안을 가리키는지 확인하고 실제 경로로 바꾼다. */
  private pathFor(key: string): string {
    const root = resolve(this.rootDir);
    const path = resolve(join(root, key));
    const inside = relative(root, path);
    if (inside.startsWith(`..${sep}`) || inside === ".." || inside === "") {
      throw new Error(`보관소 밖을 가리키는 열쇠다: ${key}`);
    }
    return path;
  }
}
