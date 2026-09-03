import type { Template, TemplateStore } from "@report-tool/core";

/**
 * DB 없이 템플릿을 메모리에 두는 참조 구현이다.
 *
 * **프로덕션 코드가 아니다.** 프로세스가 죽으면 다 사라진다. 실제 서비스에서는
 * 호스트가 자기 DB로 같은 인터페이스를 구현한다. 여기 있는 이유는 "이 인터페이스를
 * 어떻게 채우면 되는가"를 보여 주고, 데모를 실제로 돌려 보기 위해서다.
 *
 * 버전별로 따로 담는다. 하나만 담으면 발행된 문서가 가리키는 옛 판을 되찾을 수
 * 없고, 그러면 "무엇에 서명했는가"를 문서 쪽에서만 증명해야 한다.
 */
export class InMemoryTemplateStore implements TemplateStore {
  private readonly versions = new Map<string, Map<number, Template>>();

  /** 버전을 지정하지 않으면 가장 높은 판을 준다. */
  async get(id: string, version?: number): Promise<Template> {
    const byVersion = this.versions.get(id);
    if (byVersion === undefined) throw new Error(`템플릿을 찾을 수 없다: ${id}`);
    const wanted = version ?? Math.max(...byVersion.keys());
    const found = byVersion.get(wanted);
    if (found === undefined) throw new Error(`템플릿 판을 찾을 수 없다: ${id} ${wanted}판`);
    return found;
  }

  /** 같은 판을 다시 저장하면 덮어쓴다. 편집 중인 초안은 계속 바뀌기 때문이다. */
  async save(template: Template): Promise<void> {
    const byVersion = this.versions.get(template.id) ?? new Map<number, Template>();
    byVersion.set(template.version, template);
    this.versions.set(template.id, byVersion);
  }

  /** 그 판을 발행 상태로 바꿔 다시 담는다. */
  async publish(id: string, version: number): Promise<void> {
    const byVersion = this.versions.get(id);
    const found = byVersion?.get(version);
    if (byVersion === undefined || found === undefined) {
      throw new Error(`템플릿 판을 찾을 수 없다: ${id} ${version}판`);
    }
    byVersion.set(version, found.publish());
  }

  /**
   * 버전 선택에 필요한 것만 준다.
   *
   * 전체 템플릿을 내놓으면 목록 화면 하나 그리려고 요소 수백 개가 함께 넘어간다.
   */
  async listVersions(
    id: string,
  ): Promise<ReadonlyArray<Pick<Template, "id" | "version" | "status" | "updatedAt">>> {
    return [...(this.versions.get(id)?.values() ?? [])]
      .map((template) => ({
        id: template.id,
        version: template.version,
        status: template.status,
        updatedAt: template.updatedAt,
      }))
      .sort((first, second) => second.version - first.version);
  }
}
