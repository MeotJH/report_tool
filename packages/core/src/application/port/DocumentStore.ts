import { IssuedDocument } from "../../domain/document/IssuedDocument.js";

/** 발행 문서의 영속화 방식을 애플리케이션 유스케이스에서 분리한다. */
export interface DocumentStore {
  /** 새 발행 문서를 저장 기술에 관계없이 생성하게 한다. */
  create(document: IssuedDocument): Promise<void>;

  /** 이후 조회·서명·취소가 사용할 발행 문서를 동일한 방식으로 가져오게 한다. */
  get(id: string): Promise<IssuedDocument>;

  /** 불변 상태 전이로 만들어진 새 문서 전체를 일관되게 저장하게 한다. */
  update(document: IssuedDocument): Promise<void>;
}
