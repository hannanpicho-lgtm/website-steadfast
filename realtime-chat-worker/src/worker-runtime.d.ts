declare interface DurableObjectState {
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
  };
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

declare interface DurableObjectStub {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare interface DurableObjectId {}

declare interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

declare interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  first<T = unknown>(): Promise<T | null>;
}

declare interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

declare interface WebSocket {
  accept(): void;
}

type WorkerResponseInit = ResponseInit & { webSocket?: WebSocket };
