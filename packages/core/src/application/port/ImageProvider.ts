/** 렌더러가 이미지 형식을 추측하지 않도록 바이트와 미디어 타입을 함께 전달한다. */
export interface ImageAsset {
  readonly bytes: Uint8Array;
  readonly mediaType: "image/png" | "image/jpeg";
}

/** 고정 이미지 ID를 실제 파일·DB·네트워크 저장 방식에서 분리하는 계약을 정의한다. */
export interface ImageProvider {
  /** 템플릿에 저장된 자산 ID를 PDF에 임베딩할 검증된 이미지로 변환한다. */
  load(assetId: string): Promise<ImageAsset>;
}
