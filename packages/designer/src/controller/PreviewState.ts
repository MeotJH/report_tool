/**
 * 미리보기 창이 지금 무엇을 보여 줘야 하는지를 나타낸다.
 *
 * 만드는 중과 실패를 한 화면에서 구분하지 못하면, 서버가 응답하지 않는 동안
 * 담당자는 그냥 오래 걸리는 것으로 읽고 계속 기다린다. 무엇을 보여 줄지는
 * 상태 자신이 답한다.
 */
export abstract class PreviewState {
  /** 미리보기를 열지 않은 평소 상태다. */
  static closed(): PreviewState {
    return new ClosedPreview();
  }

  /** 렌더를 부탁해 두고 기다리는 중이다. */
  static working(): PreviewState {
    return new WorkingPreview();
  }

  /** 받아 온 PDF를 보여 줄 수 있다. */
  static ready(url: string): PreviewState {
    return new ReadyPreview(url);
  }

  /** 만들지 못했다. 이유를 그대로 들고 다닌다. */
  static failed(reason: string): PreviewState {
    return new FailedPreview(reason);
  }

  /** 미리보기 창을 띄워 둬야 하는 상태인지 알려 준다. */
  abstract isOpen(): boolean;

  /** 렌더를 기다리는 중인지 알려 준다. 그동안에는 또 부탁하지 않는다. */
  abstract isWorking(): boolean;

  /** 화면에 그대로 띄울 짧은 말이다. */
  abstract label(): string;

  /** 보여 줄 PDF 주소다. 아직 없거나 실패했으면 `null`이다. */
  abstract documentUrl(): string | null;
}

/** 미리보기를 열지 않은 상태다. */
class ClosedPreview extends PreviewState {
  /** 창을 띄우지 않는다. */
  isOpen(): boolean {
    return false;
  }

  /** 기다리는 것이 없다. */
  isWorking(): boolean {
    return false;
  }

  /** 보여 줄 말이 없다. */
  label(): string {
    return "";
  }

  /** 보여 줄 문서가 없다. */
  documentUrl(): string | null {
    return null;
  }
}

/** 렌더를 기다리는 중이다. */
class WorkingPreview extends PreviewState {
  /** 기다리는 동안에도 창은 떠 있어야 한다. 그래야 무엇을 기다리는지 보인다. */
  isOpen(): boolean {
    return true;
  }

  /** 이 상태가 곧 기다리는 중이다. */
  isWorking(): boolean {
    return true;
  }

  /** 발행본과 같은 경로로 만들고 있다는 사실을 알린다. */
  label(): string {
    return "발행본과 같은 경로로 만드는 중…";
  }

  /** 아직 문서가 없다. */
  documentUrl(): string | null {
    return null;
  }
}

/** 받아 온 PDF를 보여 준다. */
class ReadyPreview extends PreviewState {
  /** 이 주소는 창을 닫을 때 반드시 반납해야 한다. */
  constructor(private readonly url: string) {
    super();
  }

  /** 문서를 띄운다. */
  isOpen(): boolean {
    return true;
  }

  /** 다 받았다. */
  isWorking(): boolean {
    return false;
  }

  /** 이것이 발행본과 같은 것이 아님을 밝힌다. 워터마크가 찍혀 나온다. */
  label(): string {
    return "미리보기 (발행본에는 워터마크가 없습니다)";
  }

  /** 띄울 문서의 주소다. */
  documentUrl(): string | null {
    return this.url;
  }
}

/** 만들지 못한 상태다. */
class FailedPreview extends PreviewState {
  /** 실패한 이유를 그대로 보존한다. 짐작한 말로 바꾸면 원인을 찾을 수 없다. */
  constructor(private readonly reason: string) {
    super();
  }

  /** 실패도 창 안에서 보여 준다. 창이 그냥 닫히면 눌리지 않은 것처럼 보인다. */
  isOpen(): boolean {
    return true;
  }

  /** 더 기다릴 것이 없다. 다시 눌러 볼 수 있다. */
  isWorking(): boolean {
    return false;
  }

  /** 무엇 때문에 실패했는지까지 보여 준다. */
  label(): string {
    return `미리보기 실패: ${this.reason}`;
  }

  /** 보여 줄 문서가 없다. */
  documentUrl(): string | null {
    return null;
  }
}
