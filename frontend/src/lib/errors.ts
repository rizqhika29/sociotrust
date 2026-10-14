import { RpcError } from "./rpc";

export interface FriendlyError {
  title: string;
  detail: string;
  hint: string;
  retryable: boolean;
}

function rawMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Map gen_call / RPC read failures (RpcError from lib/rpc) to guidance. */
export function mapReadError(err: unknown): FriendlyError {
  if (err instanceof RpcError) {
    switch (err.kind) {
      case "transport":
        return {
          title: "Cannot reach Studio RPC",
          detail: err.message,
          hint: "Check your connection, then retry. Reads are automatic — nothing was lost.",
          retryable: true,
        };
      case "timeout":
        return {
          title: "Read timed out",
          detail: err.message,
          hint: "Reads execute GenVM work on the node and can be slow. One automatic retry already ran — try again manually.",
          retryable: true,
        };
      case "rate-limited":
        return {
          title: "Rate limited",
          detail: err.message,
          hint: "Studio allows 60 req/min per IP. Wait about a minute — retrying now only extends the cooldown.",
          retryable: true,
        };
      case "queue-full":
        return {
          title: "Too many in-flight transactions",
          detail: err.message,
          hint: "Wait for your pending transaction receipts before sending more.",
          retryable: true,
        };
      case "contract-missing":
        return {
          title: "Contract not found",
          detail: `The node reports no contract at the configured address (code -32001). The address may be wrong or the contract may not exist on this network.`,
          hint: "Verify NEXT_PUBLIC_CONTRACT_ADDRESS and that your wallet is on GenLayer Studio (chain 61999).",
          retryable: false,
        };
      case "contract-error":
        return {
          title: "Node reported an execution error",
          detail: err.message,
          hint: "The read itself failed inside GenVM. Retry once; if it persists, check the contract state via the explorer.",
          retryable: true,
        };
      case "bad-shape":
        return {
          title: "Unexpected response",
          detail: err.message,
          hint: "The RPC answered with data the app did not expect. This usually means an SDK/network version skew — retry, then report it.",
          retryable: true,
        };
      default:
        return {
          title: "Read failed",
          detail: err.message || "Unknown RPC failure.",
          hint: "Retry the read. Writes are unaffected.",
          retryable: true,
        };
    }
  }
  return mapError(err);
}

/** Map contract [TAGS] and wallet errors to human-friendly guidance. */
export function mapError(err: unknown): FriendlyError {
  const msg = rawMessage(err);

  const tagged = msg.match(/\[(EXPECTED|EXTERNAL|TRANSIENT|LLM_ERROR)\]\s*([\s\S]*?)(?:["'}]|$)/);
  if (tagged) {
    const [, tag, detailRaw] = tagged;
    const detail = detailRaw.trim().slice(0, 300) || "The contract rejected this transaction.";
    switch (tag) {
      case "EXPECTED":
        return {
          title: "Check your input",
          detail,
          hint: detail.includes("No challenge")
            ? "Request a challenge first (step 2), then verify."
            : detail.includes("already sealed")
              ? "This GitHub identity already belongs to another wallet. Each identity seals exactly one wallet."
              : detail.includes("does not match")
                ? "The gist's GitHub owner differs from your username — the gist must be under your own account."
                : detail.includes("anonymous gist")
                  ? "Gists without a GitHub owner cannot prove account ownership. Create the gist while logged in."
                  : detail.includes("challenge message not found") || detail.includes("not found in gist")
                    ? "Make sure the exact challenge text is inside the gist files, then retry."
                    : detail.includes("Only 'github'")
                      ? "Only GitHub gists are supported — ownership is verified against GitHub's API."
                      : detail.includes("username")
                        ? "Check the GitHub username format and try again."
                        : "Fix the highlighted issue and try again.",
          retryable: true,
        };
      case "EXTERNAL":
        return {
          title: "Proof page unreachable",
          detail,
          hint: "The validators could not fetch your proof URL (often a 4xx). Make the page public and check the URL.",
          retryable: true,
        };
      case "TRANSIENT":
        return {
          title: "Temporary network hiccup",
          detail,
          hint: "Validators hit a transient failure (timeout / 5xx). Wait a few seconds and retry — nothing was stored.",
          retryable: true,
        };
      case "LLM_ERROR":
        return {
          title: "Validator AI hiccup",
          detail,
          hint: "A validator model returned an unusable answer. Retry to rotate to a fresh validator set.",
          retryable: true,
        };
    }
  }

  if (/user rejected|user denied|rejected the request/i.test(msg))
    return {
      title: "Signature rejected",
      detail: "You rejected the signature request in your wallet.",
      hint: "Approve the signature to submit the transaction.",
      retryable: true,
    };
  if (/no ethereum|window\.ethereum|no wallet|provider/i.test(msg))
    return {
      title: "No wallet found",
      detail: "No Ethereum-compatible wallet was detected in this browser.",
      hint: "Install MetaMask (or similar), create an account, then reconnect.",
      retryable: true,
    };
  if (/chain|network|61999|switch/i.test(msg) && /wrong|unsupported|unrecognized|add/i.test(msg))
    return {
      title: "Wrong network",
      detail: "Your wallet is not on the GenLayer Studio network (chain 61999).",
      hint: "Use the “Switch network” button to add and select GenLayer Studio.",
      retryable: true,
    };
  if (/undetermined/i.test(msg))
    return {
      title: "No consensus reached",
      detail: "Validators could not agree on an outcome (undetermined). No state was changed.",
      hint: "Retry — a fresh validator set will re-evaluate your proof.",
      retryable: true,
    };
  if (/rate|429|too many/i.test(msg))
    return {
      title: "Rate limited",
      detail: "Studio limits requests per IP (60/min).",
      hint: "Wait about a minute, then retry. Heavy testing is better on a local Studio.",
      retryable: true,
    };

  return {
    title: "Transaction failed",
    detail: msg.length > 280 ? `${msg.slice(0, 280)}…` : msg || "Unknown error.",
    hint: "Check the explorer link for validator details, then retry.",
    retryable: true,
  };
}
