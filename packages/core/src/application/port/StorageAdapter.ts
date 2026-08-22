/** PDF 바이트의 실제 저장 위치와 저장 기술을 애플리케이션에서 숨긴다. */
export interface StorageAdapter {
  /** 같은 발행 흐름이 파일·S3·DB 저장소 어디에서든 동작하게 한다. */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;

  /** 저장된 PDF를 저장소 종류와 무관한 바이트 형태로 돌려준다. */
  get(key: string): Promise<Uint8Array>;
}
