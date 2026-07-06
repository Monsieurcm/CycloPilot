declare module "fit-decoder" {
  export function fit2json(buffer: ArrayBuffer): unknown;
  export function parseRecords(json: unknown): unknown;
}
