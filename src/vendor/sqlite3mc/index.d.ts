export type Binding = string | number | bigint | null | Uint8Array;

export interface Connection {
  pointer: number;
  exec(sql: string | { sql: string; bind: Binding[]; rowMode: "array"; resultRows: Binding[][] }): void;
  selectValue(sql: string): Binding | undefined;
  close(): void;
}

export interface ModuleOptions {
  instantiateWasm(
    imports: WebAssembly.Imports,
    receive: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void
  ): WebAssembly.Exports;
  files?: { read(path: string): Uint8Array; remove(path: string): void };
}

export default function init(options: ModuleOptions): Promise<{
  oo1: { DB: new (path: string, flags: string) => Connection };
  capi: {
    sqlite3_key(pointer: number, key: string, byteLength: number): number;
    sqlite3_js_posix_create_file(path: string, bytes: Uint8Array): void;
  };
}>;
