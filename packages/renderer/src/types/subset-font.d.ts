declare module "subset-font" {
  interface SubsetFontOptions {
    readonly targetFormat: "truetype";
  }

  export default function subsetFont(
    rawFontBytes: Uint8Array,
    usedCharacters: string,
    options: SubsetFontOptions,
  ): Promise<Uint8Array>;
}
