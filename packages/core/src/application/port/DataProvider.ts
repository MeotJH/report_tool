/** 호스트의 실제 데이터 구조를 코어 라이브러리에서 분리하는 계약을 정의한다. */
export interface DataProvider {
  /** 개인정보를 노출하지 않고 템플릿 미리보기를 만들 수 있게 한다. */
  sample(templateId: string): Promise<unknown>;

  /** 발행 시점에만 특정 수신자의 실제 데이터를 호스트로부터 가져오게 한다. */
  resolve(templateId: string, recipientId: string): Promise<unknown>;
}
