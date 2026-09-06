export interface WasmPersistenceEngine {
  saveIndex(id: string, buffer: Uint8Array): Promise<void>;
  loadIndex(id: string): Promise<Uint8Array | null>;
}
