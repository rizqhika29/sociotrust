# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

"""
SocioTrust v2 - On-chain Identity Verification with authoritative binding.

Security model (addresses steward review):
1. AUTHORITATIVE SOURCE: proofs must be GitHub gists. The contract extracts
   the gist id from the URL and fetches the canonical GitHub API itself
   (https://api.github.com/gists/{id}). GitHub's `owner.login` field — which
   only the account holder can publish under — must equal the claimed username.
   An arbitrary HTTPS page can no longer claim an arbitrary handle.
2. UNIQUENESS: each platform identity (github:{username}) can seal exactly one
   wallet. A second wallet attempting the same identity is rejected. The same
   wallet may refresh its own seal.

Flow:
1. request_challenge() -> user dapat pesan unik
2. user creates a GitHub gist under THEIR account containing the challenge
3. verify_identity("github", username, gist_url) -> validators check API owner
   + challenge presence, enforce uniqueness
4. get_identity() / is_verified() / owner_of() -> baca status
"""

from genlayer import *
import json
import re
from dataclasses import dataclass

ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM = "[LLM_ERROR]"

SUPPORTED_PLATFORMS = ("github",)

GIST_HOSTS = ("gist.github.com", "api.github.com")
GIST_ID_RE = r"[0-9a-fA-F]{32}"
MAX_CONTENT_CHARS = 12000


def _to_addr(v) -> Address:
    if isinstance(v, Address):
        return v
    return Address(v)


def _extract_gist_id(proof_url: str) -> str:
    """Deterministic: pull the 32-hex gist id out of a gist URL."""
    m = re.search(GIST_ID_RE, proof_url)
    if not m:
        raise gl.vm.UserError(
            f"{ERROR_EXPECTED} proof_url is not a GitHub gist URL (no gist id found)"
        )
    return m.group(0).lower()


def _check_gist_host(proof_url: str) -> None:
    lowered = proof_url.strip().lower()
    if not (lowered.startswith("http://") or lowered.startswith("https://")):
        raise gl.vm.UserError(f"{ERROR_EXPECTED} proof_url must be http(s)")
    if not any(h in lowered for h in GIST_HOSTS):
        raise gl.vm.UserError(
            f"{ERROR_EXPECTED} proof_url must be a gist.github.com or api.github.com/gists URL"
        )


def _check_github_username(username: str) -> str:
    name = username.strip()
    if len(name) == 0 or len(name) > 39:
        raise gl.vm.UserError(f"{ERROR_EXPECTED} invalid GitHub username length")
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?", name):
        raise gl.vm.UserError(f"{ERROR_EXPECTED} invalid GitHub username format")
    return name


@allow_storage
@dataclass
class Identity:
    platform: str
    username: str
    proof_url: str
    gist_id: str
    verified_at: str
    verifier_note: str


class SocioTrustIdentity(gl.Contract):
    owner: Address
    challenges: TreeMap[Address, str]
    identities: TreeMap[Address, Identity]
    claimed: TreeMap[str, Address]
    verified_list: DynArray[Address]
    nonce: u256

    def __init__(self):
        self.owner = gl.message.sender_address
        self.nonce = u256(0)

    @gl.public.view
    def get_challenge(self, user: Address) -> str:
        user = _to_addr(user)
        if user in self.challenges:
            return self.challenges[user]
        return ""

    @gl.public.view
    def get_identity(self, user: Address) -> dict:
        user = _to_addr(user)
        if user not in self.identities:
            return {"verified": False, "platform": "", "username": ""}
        ident = self.identities[user]
        return {
            "verified": True,
            "platform": ident.platform,
            "username": ident.username,
            "proof_url": ident.proof_url,
            "gist_id": ident.gist_id,
            "verified_at": ident.verified_at,
            "note": ident.verifier_note,
        }

    @gl.public.view
    def is_verified(self, user: Address) -> bool:
        user = _to_addr(user)
        return user in self.identities

    @gl.public.view
    def owner_of(self, platform: str, username: str) -> str:
        """Which wallet (if any) owns a given platform identity."""
        key = platform.strip().lower() + ":" + username.strip().lower()
        if key in self.claimed:
            return str(self.claimed[key])
        return ""

    @gl.public.view
    def list_verified(self) -> list:
        return [str(a) for a in self.verified_list]

    @gl.public.write
    def request_challenge(self) -> str:
        sender = gl.message.sender_address
        self.nonce = self.nonce + u256(1)
        challenge = (
            "SocioTrust verification for "
            + str(sender)
            + " nonce "
            + str(self.nonce)
        )
        self.challenges[sender] = challenge
        return challenge

    @gl.public.write
    def verify_identity(
        self, platform: str, username: str, proof_url: str
    ) -> dict:
        sender = gl.message.sender_address
        platform_norm = platform.strip().lower()

        if platform_norm not in SUPPORTED_PLATFORMS:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Unsupported platform: {platform}. Only 'github' "
                "is supported (authoritative gist-ownership check)"
            )
        username = _check_github_username(username)
        proof_url = proof_url.strip()
        _check_gist_host(proof_url)
        gist_id = _extract_gist_id(proof_url)

        if sender not in self.challenges:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} No challenge. Call request_challenge() first"
            )
        challenge = self.challenges[sender]

        # Uniqueness: one identity -> one wallet (checked deterministically
        # before consensus so every node agrees on the outcome).
        claim_key = "github:" + username.lower()
        if claim_key in self.claimed and self.claimed[claim_key] != sender:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} identity github:{username} already sealed to "
                "another wallet"
            )

        api_url = "https://api.github.com/gists/" + gist_id

        def leader_fn():
            try:
                res = gl.nondet.web.get(
                    api_url,
                    headers={
                        "User-Agent": "SocioTrust/2.0",
                        "Accept": "application/vnd.github+json",
                    },
                )
            except Exception as e:
                raise gl.vm.UserError(f"{ERROR_TRANSIENT} gist fetch failed: {e}")

            if res.status == 404:
                raise gl.vm.UserError(
                    f"{ERROR_EXTERNAL} gist not found: {gist_id}"
                )
            if res.status == 403:
                raise gl.vm.UserError(
                    f"{ERROR_TRANSIENT} GitHub API rate limited, retry later"
                )
            if res.status < 200 or res.status >= 300:
                if res.status >= 400 and res.status < 500:
                    raise gl.vm.UserError(
                        f"{ERROR_EXTERNAL} GitHub API returned {res.status}"
                    )
                raise gl.vm.UserError(
                    f"{ERROR_TRANSIENT} GitHub API unavailable: {res.status}"
                )

            try:
                data = json.loads(res.body.decode("utf-8"))
            except Exception:
                raise gl.vm.UserError(
                    f"{ERROR_EXTERNAL} cannot parse GitHub API response"
                )

            owner = data.get("owner") or {}
            owner_login = str(owner.get("login") or "")
            if len(owner_login) == 0:
                raise gl.vm.UserError(
                    f"{ERROR_EXPECTED} anonymous gist cannot prove account ownership"
                )
            owner_match = owner_login.lower() == username.lower()

            # Concatenate gist file contents (stable), truncated.
            chunks: list = []
            files = data.get("files") or {}
            if isinstance(files, dict):
                for _fname, fobj in files.items():
                    if isinstance(fobj, dict):
                        c = fobj.get("content")
                        if isinstance(c, str):
                            chunks.append(c)
                            if sum(len(x) for x in chunks) >= MAX_CONTENT_CHARS:
                                break
            content = "".join(chunks)[:MAX_CONTENT_CHARS]
            message_found = challenge in content
            return {
                "owner_match": owner_match,
                "message_found": message_found,
                "owner": owner_login[:39],
            }

        def _handle_leader_error(leaders_res, fn) -> bool:
            leader_msg = (
                leaders_res.message
                if hasattr(leaders_res, "message")
                else str(leaders_res)
            )
            try:
                fn()
                return False
            except gl.vm.UserError as e:
                validator_msg = (
                    e.message if hasattr(e, "message") else str(e)
                )
                if validator_msg.startswith(
                    ERROR_EXPECTED
                ) or validator_msg.startswith(ERROR_EXTERNAL):
                    return validator_msg == leader_msg
                if validator_msg.startswith(
                    ERROR_TRANSIENT
                ) and leader_msg.startswith(ERROR_TRANSIENT):
                    return True
                return False
            except Exception:
                return False

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)
            try:
                mine = leader_fn()
            except Exception:
                return False
            lead = leaders_res.calldata
            try:
                return (
                    bool(mine["owner_match"]) == bool(lead["owner_match"])
                    and bool(mine["message_found"])
                    == bool(lead["message_found"])
                )
            except Exception:
                return False

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        if not result.get("owner_match", False):
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} gist owner does not match username {username}"
            )
        if not result.get("message_found", False):
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} challenge message not found in gist files"
            )

        # Storage writes only after consensus, deterministic context.
        ident = Identity(
            platform=platform_norm,
            username=username,
            proof_url=proof_url,
            gist_id=gist_id,
            verified_at="verified",
            verifier_note="gist owner @" + result.get("owner", ""),
        )
        is_new = sender not in self.identities
        self.identities[sender] = ident
        self.claimed[claim_key] = sender
        if is_new:
            self.verified_list.append(sender)

        return {"verified": True, "username": username, "platform": platform_norm}

    @gl.public.write
    def revoke(self) -> None:
        sender = gl.message.sender_address
        if sender not in self.identities:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} no identity to revoke")
        ident = self.identities[sender]
        key = ident.platform + ":" + ident.username.lower()
        if key in self.claimed and self.claimed[key] == sender:
            del self.claimed[key]
        del self.identities[sender]
