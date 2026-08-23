/**
 * 사용자가 지은 이름 뒤에 붙는 조사를 받침에 맞게 고른다.
 *
 * 검증 메시지에 사용자가 지은 변수 이름이 그대로 들어가므로, 조사를 고정하면
 * "대표자을 참조한다"처럼 읽히는 문장이 나온다. 오류 메시지는 사용자가 무엇을
 * 고쳐야 하는지 알려주는 문장이므로 읽히는 대로 맞아야 한다.
 */
export class KoreanParticle {
  /** 한글 음절 영역의 시작과 끝 코드포인트다. */
  private static readonly SYLLABLE_START = 0xac00;
  private static readonly SYLLABLE_END = 0xd7a3;

  /** 한 초성에 딸린 중성·종성 조합 수로, 종성 유무 판정에 쓰인다. */
  private static readonly JONGSEONG_COUNT = 28;

  /** 목적격 조사를 받침 여부에 맞게 붙인다. */
  static objectOf(word: string): string {
    return `${word}${KoreanParticle.select(word, "을", "를")}`;
  }

  /** 주격 조사를 받침 여부에 맞게 붙인다. */
  static subjectOf(word: string): string {
    return `${word}${KoreanParticle.select(word, "이", "가")}`;
  }

  /** 한글이 아닌 이름에는 두 조사를 함께 보여 문장이 어색해지지 않게 한다. */
  private static select(
    word: string,
    withFinal: string,
    withoutFinal: string,
  ): string {
    const hasFinal = KoreanParticle.hasFinalConsonant(word);
    if (hasFinal === undefined) return `${withFinal}(${withoutFinal})`;
    return hasFinal ? withFinal : withoutFinal;
  }

  /** 마지막 글자가 한글 음절일 때만 종성 유무를 판단한다. */
  private static hasFinalConsonant(word: string): boolean | undefined {
    const lastCharacter = [...word].at(-1);
    if (lastCharacter === undefined) return undefined;
    const code = lastCharacter.codePointAt(0) ?? 0;
    if (code < KoreanParticle.SYLLABLE_START || code > KoreanParticle.SYLLABLE_END) {
      return undefined;
    }
    return (code - KoreanParticle.SYLLABLE_START) % KoreanParticle.JONGSEONG_COUNT !== 0;
  }
}
