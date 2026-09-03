import type { ImageAsset } from "@report-tool/core";
import { useState } from "react";
import type { ImageStore } from "../ImageStore.js";

/** 발행 렌더러가 임베딩할 수 있는 형식만 받는다. 나머지는 PDF에서 예외가 된다. */
const ALLOWED: ReadonlyMap<string, ImageAsset["mediaType"]> = new Map([
  ["image/png", "image/png"],
  ["image/jpeg", "image/jpeg"],
]);

/**
 * 그림 파일을 골라 호스트 보관소에 올리고, 받은 식별자를 요소에 적는다.
 *
 * 지금까지는 `자산 ID`를 손으로 타이핑해야 했다. 담당자는 그 문자열이 무엇인지
 * 알 방법이 없고, 맞게 적었는지도 발행해 봐야 알 수 있었다. 그래서 표지 로고와
 * 직인이 들어가지 못했다.
 *
 * 파일을 읽는 일은 화면의 몫이다. 도메인과 포트는 브라우저의 `File`을 모르고,
 * 바이트와 미디어 타입만 안다.
 */
export function ImagePickField(props: {
  images: ImageStore;
  onPicked: (assetId: string) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  if (!props.images.canUpload()) return null;
  const pick = async (file: File): Promise<void> => {
    const mediaType = ALLOWED.get(file.type);
    if (mediaType === undefined) {
      setProblem("PNG와 JPEG만 넣을 수 있습니다. 발행본이 그 둘만 임베딩합니다.");
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      props.onPicked(await props.images.upload({ bytes, mediaType }, file.name));
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <div className="rt-image-pick">
      <label className="rt-image-pick-button">
        ⇧ 그림 파일 고르기
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // 같은 파일을 다시 골라도 change가 오도록 값을 비운다. 비우지 않으면
            // 파일을 고쳐서 다시 올리려는 두 번째 시도가 아무 일도 하지 않는다.
            event.target.value = "";
            if (file !== undefined) void pick(file);
          }}
        />
      </label>
      {problem === null ? null : <p className="rt-inspector-note">{problem}</p>}
    </div>
  );
}
