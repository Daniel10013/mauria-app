// Wrapper de console que respeita NODE_ENV e formata contexto estruturado.
// Logs `info` ficam silenciosos em produção (apenas warn/error). Em dev,
// imprime tudo. Em test, fica em silêncio total.

type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, message: string, meta?: unknown): void {
  if (process.env.NODE_ENV === "test") return;

  const ts = new Date().toISOString();
  const payload = meta === undefined ? "" : ` ${safeStringify(meta)}`;
  const line = `[${ts}] [${level.toUpperCase()}] ${message}${payload}`;

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  if (process.env.NODE_ENV === "development") {
    console.info(line);
  }
}

function safeStringify(value: unknown): string {
  try {
    if (value instanceof Error) {
      return JSON.stringify({ name: value.name, message: value.message });
    }
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
};
