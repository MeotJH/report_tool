/**
 * 지금 문서가 보관소와 같은지, 다른지, 다르게 만드는 중인지를 나타낸다.
 *
 * 이 넷을 문자열 하나로 두면 화면이 상태마다 `if`를 늘어놓게 되고, 그러다 실패를
 * 저장됨처럼 보여 주는 일이 생긴다. **실패했는데 저장된 것으로 보이면 담당자는
 * 창을 닫고, 그 순간 작업이 사라진다.** 그래서 무엇을 보여 줄지는 상태 자신이
 * 답한다.
 */
export abstract class SaveState {
  /** 보관소의 것과 지금 문서가 같다. */
  static saved(): SaveState {
    return new SavedState();
  }

  /** 저장한 뒤로 고친 것이 있다. */
  static unsaved(): SaveState {
    return new UnsavedState();
  }

  /** 보관소에 넣는 중이다. */
  static saving(): SaveState {
    return new SavingState();
  }

  /** 넣지 못했다. 이유를 그대로 들고 다닌다. */
  static failed(reason: string): SaveState {
    return new FailedState(reason);
  }

  /** 화면에 그대로 띄울 짧은 말이다. */
  abstract label(): string;

  /** 지금 저장 버튼을 누를 수 있는지 알려 준다. */
  abstract canSave(): boolean;

  /** 눈에 띄게 보여 줘야 하는 상태인지 알려 준다. */
  abstract needsAttention(): boolean;
}

/** 보관소와 같은 상태다. 더 할 일이 없다. */
class SavedState extends SaveState {
  /** 마지막으로 넣은 그대로임을 알린다. */
  label(): string {
    return "저장됨";
  }

  /** 같은 것을 다시 넣지 않는다. */
  canSave(): boolean {
    return false;
  }

  /** 알릴 것이 없다. */
  needsAttention(): boolean {
    return false;
  }
}

/** 고친 것이 아직 보관소에 없는 상태다. */
class UnsavedState extends SaveState {
  /** 창을 닫으면 잃는다는 사실을 짧게 알린다. */
  label(): string {
    return "저장 안 됨";
  }

  /** 지금이 저장할 때다. */
  canSave(): boolean {
    return true;
  }

  /** 잃을 것이 있으므로 눈에 띄어야 한다. */
  needsAttention(): boolean {
    return true;
  }
}

/** 보관소에 넣는 중이다. */
class SavingState extends SaveState {
  /** 기다리는 중임을 알린다. */
  label(): string {
    return "저장 중…";
  }

  /** 끝나기 전에 또 넣으면 어느 것이 남을지 정할 수 없다. */
  canSave(): boolean {
    return false;
  }

  /** 곧 끝나는 일이라 따로 알리지 않는다. */
  needsAttention(): boolean {
    return false;
  }
}

/** 넣지 못한 상태다. 고친 것은 아직 편집기에만 있다. */
class FailedState extends SaveState {
  /** 실패한 이유를 그대로 보존한다. 짐작한 말로 바꾸면 원인을 찾을 수 없다. */
  constructor(private readonly reason: string) {
    super();
  }

  /** 무엇 때문에 실패했는지까지 보여 준다. */
  label(): string {
    return `저장 실패: ${this.reason}`;
  }

  /** 다시 눌러 볼 수 있어야 한다. */
  canSave(): boolean {
    return true;
  }

  /** 작업을 잃을 수 있는 상태다. */
  needsAttention(): boolean {
    return true;
  }
}
