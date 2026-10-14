# INFORMATION_NEEDED — Steward Review Response (SocioTrust v2)

## Steward request (verbatim)

> We cannot accept this submission because any HTTP(S) page can be used to claim
> any social handle, so the contract does not prove account ownership and cannot
> support its identity or Sybil-resistance claim. A qualifying resubmission would
> need to bind proofs to authoritative platform and account sources and prevent
> the same identity from sealing multiple wallets.

Two requirements: **(R1)** bind proofs to authoritative platform/account sources;
**(R2)** prevent one identity from sealing multiple wallets. Both are resolved in
the v2 rebuild below (live contract `0x9aE81BD3083A8D8CE24b256c02652B84fB8f5121`,
GenLayer Studio Network).

## R1 — Authoritative binding: resolution

**Problem in v1:** `verify_identity` accepted any `http(s)` URL and asked an LLM
whether the page "looked like" the claimed user. Any page could claim any handle.

**Fix in v2 (`sociotrust.py`, `verify_identity`):**
- Only `"github"` is accepted; every other platform reverts deterministically.
- The proof URL must live on `gist.github.com` or `api.github.com/gists`, and the
  contract extracts the 32-hex gist id and fetches the canonical record itself:
  `GET https://api.github.com/gists/{id}` (never trusts user-supplied page bytes).
- GitHub's `owner.login` — a field only the account holder can publish under —
  must equal the claimed username (case-insensitive). Mismatch reverts.
- The challenge must appear inside the gist's file contents (concatenated,
  truncated at 12k chars). Absence reverts.
- Anonymous gists (`owner == null`) revert: no owner, no ownership proof.
- GitHub API failures are classified: 404 → `[EXTERNAL]`, 403 → `[TRANSIENT]`
  (rate limit), 5xx/network → `[TRANSIENT]`, unparseable body → `[EXTERNAL]`.
- No LLM is involved anymore: ownership is API-grounded and the verdict is two
  deterministic booleans (`owner_match`, `message_found`) compared field-wise by
  validators under `run_nondet_unsafe`.

## R2 — Uniqueness: resolution

**Problem in v1:** nothing stopped N wallets from sealing the same handle.

**Fix in v2:**
- New storage `claimed: TreeMap[str, Address]` keyed `github:{lower(username)}`.
- Before consensus (deterministic, so all nodes agree), a different wallet
  holding the same key reverts: `identity already sealed to another wallet`.
- The same wallet may refresh its seal (new challenge, new gist) without
  duplicating the registry list.
- `revoke()` deletes the claim, freeing the identity for a future owner.
- New view `owner_of(platform, username) -> wallet` lets anyone audit which
  wallet owns an identity.

## Full changelog v1 → v2

- **Contract:** rewritten to the model above; added `gist_id` to stored
  `Identity`, `claimed` map, `owner_of` view; removed LLM prompt path and
  non-GitHub platforms. Lint: 0 issues. Deployed FINALIZED with clean
  stdout/stderr at `0x9aE81BD3083A8D8CE24b256c02652B84fB8f5121`
  (deploy tx `0x6a148f2b666af2ad07b41554a4a14c3e936634b56af112c0af3add0630aa6136`).
- **Tests:** 11/11 direct tests pass (success, owner mismatch, anonymous gist,
  missing challenge, gist 404, second-wallet rejected, same-wallet refresh,
  revoke releases claim, non-GitHub rejected, non-gist URL rejected, no-challenge
  rejected). Integration suite updated to the v2 surface.
- **Live consensus evidence (StudioNet):** non-GitHub platform write and
  nonexistent-gist write both reached ACCEPTED but executed as failures with
  zero state change (`is_verified == false`, `owner_of == ""`).
- **Frontend:** GitHub-only verify flow with a 4-step gist creation guide,
  gist-ID + canonical `api.github.com/gists/{id}` record link on every seal card,
  validator vote breakdowns (Agree/Idle/Disagree), per-tag error guidance
  (mismatch / anonymous / already-sealed / 404 / rate-limit), EIP-6963 wallet
  picker, double-submit guard, and RPC-resilient reads. Points at the v2 address.

## Where to verify each claim

- Contract source: `sociotrust.py` in this repo; live code matches the deployed
  bytecode semantics (deploy tx above, clean stdout/stderr).
- Ownership + uniqueness logic: `verify_identity`, `revoked` claim release in
  `revoke`, audit view `owner_of`.
- Negative-path consensus: replay any rejected case above on StudioNet — each
  reaches ACCEPTED yet executes as a failure with zero state change, inspectable
  in the explorer receipt.
- Positive path: issue a challenge, publish it in a gist under any GitHub
  account, submit — the seal, dossier, and validator evidence appear on-chain.
