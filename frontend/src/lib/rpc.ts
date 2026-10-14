/**
 * RPC resilience layer for gen_call reads (client.readContract).
 *
 * Failure modes observed on GenLayer Studio:
 * - transport: fetch TypeError (RPC down, offline, CORS, DNS)
 * - timeout: node slow or overloaded (reads are GenVM executions, not cache hits)
 * - 429 / -32429: per-IP rate limits (60/min). NEVER auto-retried — retrying
 *   into a rate limit is what turns a slow page into a banned IP.
 * - -32028: pending-queue cap (writes, surfaced here for completeness)
 * - -32001 "contract not found": wrong address or contract not on this network
 * - gen_call status codes: 0 success / 1 user error / 2 vm error / 3 internal
 * - shape errors: RPC answered but payload is not what we expected
 */

export type RpcFailureKind =
  | "transport"
  | "timeout"
  | "rate-limited"
  | "queue-full"
  | "contract-missing"
  | "contract-error"
  | "bad-shape"
  | "unknown";

export class RpcError extends Error {
  kind: RpcFailureKind;
  code: number | string | null;
  retryable: boolean;

  constructor(kind: RpcFailureKind, detail: string, code: number | string | null = null) {
    super(detail);
    this.name = "RpcError";
    this.kind = kind;
    this.code = code;
    // Rate limits must cool down first; contract errors are deterministic.
    this.retryable = kind === "transport" || kind === "timeout";
  }
}

export const READ_TIMEOUT_MS = 20000;

function extractCode(err: unknown): number | string | null {
  if (typeof err === "object" && err !== null) {
    const anyErr = err as Record<string, unknown>;
    if (typeof anyErr.code === "number" || typeof anyErr.code === "string") return anyErr.code;
    const data = anyErr.data as Record<string, unknown> | undefined;
    if (data && (typeof data.code === "number" || typeof data.code === "string")) return data.code;
    const cause = anyErr.cause as Record<string, unknown> | undefined;
    if (cause && (typeof cause.code === "number" || typeof cause.code === "string"))
      return cause.code;
  }
  return null;
}

export function classifyRpcError(err: unknown): RpcError {
  if (err instanceof RpcError) return err;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const code = extractCode(err);

  if (code === -32001 || /contract not found/i.test(msg))
    return new RpcError("contract-missing", msg || "Contract not found at this address.", code);
  if (
    code === -32429 ||
    code === 429 ||
    /429|too many requests|rate.?limit|quota/i.test(msg)
  )
    return new RpcError(
      "rate-limited",
      "Studio rate limit reached (60 req/min per IP). Wait about a minute before retrying.",
      code ?? 429
    );
  if (code === -32028 || /pending.?queue|too many in-flight/i.test(msg))
    return new RpcError(
      "queue-full",
      "Too many in-flight transactions for this sender. Wait for receipts before sending more.",
      code ?? -32028
    );
  if (/timed? ?out|TIMEOUT/i.test(msg) && !/waiting for consensus|finaliz/i.test(msg))
    return new RpcError("timeout", `Read timed out after ${READ_TIMEOUT_MS / 1000}s.`, "TIMEOUT");
  if (
    err instanceof TypeError ||
    /fetch failed|failed to fetch|network ?error|networkrequestfailed|load failed|econn|enotfound|socket/i.test(
      msg
    )
  )
    return new RpcError(
      "transport",
      "Cannot reach the Studio RPC. Check your connection — the node may also be restarting.",
      code
    );
  const genCallStatus = msg.match(/status[^0-9]*code[^0-9]*([123])/i);
  if (genCallStatus) {
    const c = genCallStatus[1];
    const label =
      c === "1" ? "contract user error" : c === "2" ? "VM error" : "node internal error";
    return new RpcError("contract-error", `gen_call returned ${label}: ${msg.slice(0, 220)}`, code);
  }
  if (/unexpected|shape|decode|parse|invalid response|undefined is not/i.test(msg))
    return new RpcError("bad-shape", `Unexpected RPC response shape: ${msg.slice(0, 220)}`, code);
  return new RpcError("unknown", msg.slice(0, 280) || "Unknown RPC failure.", code);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run an idempotent read with a timeout and exactly ONE retry for
 * transport/timeout failures. Rate limits and deterministic errors are
 * never retried automatically.
 */
export async function resilientRead<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { timeoutMs?: number; retries?: number } = {}
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? READ_TIMEOUT_MS;
  const retries = opts.retries ?? 1;

  const attempt = async (): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new RpcError("timeout", `${label} timed out after ${timeoutMs / 1000}s.`, "TIMEOUT")),
          timeoutMs
        );
      });
      return await Promise.race([fn(), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch (e) {
    const classified = classifyRpcError(e);
    if (retries > 0 && classified.retryable) {
      await sleep(1500);
      try {
        return await attempt();
      } catch (e2) {
        throw classifyRpcError(e2);
      }
    }
    throw classified;
  }
}
