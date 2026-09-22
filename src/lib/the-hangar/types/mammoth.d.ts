// mammoth ships no type definitions and there's no @types/mammoth package.
// Minimal ambient declaration covering only what documentExtraction.ts uses.
declare module "mammoth" {
  export interface ExtractRawTextResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(input: { buffer: Buffer }): Promise<ExtractRawTextResult>;
}
