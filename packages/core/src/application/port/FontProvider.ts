/** 렌더러가 폰트의 파일 위치나 다운로드 방법을 몰라도 TTF 바이트를 받게 한다. */
export interface FontProvider {
  /** 요청한 글꼴과 굵기에 맞는 임베딩용 데이터를 공급한다. */
  load(family: string, weight: number): Promise<Uint8Array>;
}
