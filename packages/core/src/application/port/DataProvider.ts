/** 디자이너가 연결 가능한 데이터 필드의 구조와 표시 정보를 표현한다. */
export interface FieldSchema {
  readonly [path: string]: {
    readonly label: string;
    readonly type:
      | "string"
      | "number"
      | "currency"
      | "date"
      | "boolean"
      | "array"
      | "image";
    readonly children?: FieldSchema;
    readonly sensitive?: boolean;
  };
}

/** 호스트의 실제 데이터 구조를 코어 라이브러리에서 분리하는 계약을 정의한다. */
export interface DataProvider {
  /** 디자이너가 바인딩 대상을 선택할 수 있도록 필드 목록만 제공한다. */
  fields(templateId: string): Promise<FieldSchema>;

  /** 개인정보를 노출하지 않고 템플릿 미리보기를 만들 수 있게 한다. */
  sample(templateId: string): Promise<unknown>;

  /** 발행 시점에만 특정 수신자의 실제 데이터를 호스트로부터 가져오게 한다. */
  resolve(templateId: string, recipientId: string): Promise<unknown>;
}
