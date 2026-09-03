import {
  PageSpec,
  Template,
  type DocumentRenderer,
  type RenderMode,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { DocumentPreview, type PreviewLinkFactory } from "./DocumentPreview.js";
import { EditorController } from "./EditorController.js";

describe("DocumentPreview", () => {
  it("렌더러를 주지 않은 호스트에서는 미리보기를 쓸 수 없다", () => {
    const controller = new EditorController(createTemplate());

    expect(new DocumentPreview(controller, null, new FakeLinks()).isAvailable()).toBe(false);
  });

  it("처음에는 닫혀 있다", () => {
    const { preview } = createPreview();

    expect(preview.state().isOpen()).toBe(false);
  });

  it("열면 지금 문서와 샘플 데이터로 그린다", async () => {
    const { preview, renderer } = createPreview();

    await preview.open();

    expect(renderer.calls).toEqual([{ name: "테스트", mode: "preview" }]);
  });

  it("발행본이 아니라 미리보기로만 그린다", async () => {
    const { preview, renderer } = createPreview();

    await preview.open();

    expect(renderer.calls[0]?.mode).toBe("preview");
  });

  it("다 그리면 볼 수 있는 주소를 준다", async () => {
    const { preview } = createPreview();

    await preview.open();

    expect(preview.state().documentUrl()).toBe("blob:1");
  });

  it("그리지 못하면 이유를 보여 준다", async () => {
    const { preview, renderer } = createPreview();
    renderer.failWith = new Error("서버가 응답하지 않는다");

    await preview.open();

    expect(preview.state().label()).toBe("미리보기 실패: 서버가 응답하지 않는다");
  });

  it("닫으면 만들어 둔 주소를 되돌려준다", async () => {
    const { preview, links } = createPreview();
    await preview.open();

    preview.close();

    expect(links.revoked).toEqual(["blob:1"]);
    expect(preview.state().isOpen()).toBe(false);
  });

  it("다시 열면 앞서 만든 주소를 버린다", async () => {
    const { preview, links } = createPreview();
    await preview.open();

    await preview.open();

    expect(links.revoked).toEqual(["blob:1"]);
    expect(preview.state().documentUrl()).toBe("blob:2");
  });

  it("그리는 중에는 또 그리지 않는다", async () => {
    const { preview, renderer } = createPreview();
    renderer.holdNextRender();
    const first = preview.open();
    await preview.open();
    renderer.releaseHeldRender();
    await first;

    expect(renderer.calls).toHaveLength(1);
  });

  it("상태가 바뀌면 화면에 알린다", async () => {
    const { preview } = createPreview();
    let calls = 0;
    preview.subscribe(() => { calls += 1; });

    await preview.open();

    expect(calls).toBeGreaterThan(0);
  });
});

/** 호스트가 주는 렌더 경로 자리에 들어간다. 실제로는 서버를 부른다. */
class FakeRenderer implements DocumentRenderer {
  readonly calls: { name: string; mode: RenderMode }[] = [];
  failWith: Error | null = null;
  private release: (() => void) | null = null;

  /** 무엇을 어떤 모드로 몇 번 그렸는지 테스트가 그대로 확인하게 한다. */
  async render(template: Template, _data: unknown, mode: RenderMode): Promise<Uint8Array> {
    if (this.failWith !== null) throw this.failWith;
    if (this.release !== null) await new Promise<void>((resolve) => { this.release = resolve; });
    this.calls.push({ name: template.name, mode });
    return new Uint8Array([37, 80, 68, 70]);
  }

  /** 다음 렌더를 놓아 줄 때까지 끝내지 않게 한다. */
  holdNextRender(): void {
    this.release = () => undefined;
  }

  /** 붙잡아 둔 렌더를 끝내게 한다. */
  releaseHeldRender(): void {
    const release = this.release;
    this.release = null;
    release?.();
  }
}

/** 브라우저 없이 주소 발급과 반납만 흉내 낸다. */
class FakeLinks implements PreviewLinkFactory {
  readonly revoked: string[] = [];
  private issued = 0;

  /** 부를 때마다 다른 주소를 준다. 앞 주소를 버렸는지 셀 수 있게. */
  create(): string {
    this.issued += 1;
    return `blob:${this.issued}`;
  }

  /** 반납한 주소를 그대로 기록한다. */
  revoke(url: string): void {
    this.revoked.push(url);
  }
}

/** 편집 세션과 렌더 경로를 이어 둔 기본 상태를 만든다. */
function createPreview(): {
  preview: DocumentPreview;
  renderer: FakeRenderer;
  links: FakeLinks;
} {
  const controller = new EditorController(createTemplate());
  const renderer = new FakeRenderer();
  const links = new FakeLinks();
  return { preview: new DocumentPreview(controller, renderer, links), renderer, links };
}

/** 미리보기 테스트가 사용할 빈 초안 템플릿을 만든다. */
function createTemplate(): Template {
  return new Template({
    id: "template", name: "테스트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [0, 0, 0, 0]),
    fonts: ["MalgunGothic"], elements: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  });
}
