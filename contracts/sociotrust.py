# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

"""
SocioTrust - On-chain Identity Verification
Link Your Social, Prove Your Trust.

Flow:
1. request_challenge() -> user dapat pesan unik
2. user posting pesan itu di social media publik (GitHub Gist, blog, dll)
3. verify_identity(platform, username, proof_url) -> validator fetch + LLM cek
4. get_identity() / is_verified() -> baca status
"""

from genlayer import *
import json
from dataclasses import dataclass

ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM = "[LLM_ERROR]"

SUPPORTED_PLATFORMS = ("github", "x", "twitter", "gist", "blog")


def _to_addr(v) -> Address:
    if isinstance(v, Address):
        return v
    return Address(v)


@allow_storage
@dataclass
class Identity:
    platform: str
    username: str
    proof_url: str
    verified_at: str
    verifier_note: str


class SocioTrustIdentity(gl.Contract):
    owner: Address
    challenges: TreeMap[Address, str]
    identities: TreeMap[Address, Identity]
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
            "verified_at": ident.verified_at,
            "note": ident.verifier_note,
        }

    @gl.public.view
    def is_verified(self, user: Address) -> bool:
        user = _to_addr(user)
        return user in self.identities

    @gl.public.view
    def list_verified(self) -> list:
        return [str(a) for a in self.verified_list]

    @gl.public.write
    def request_challenge(self) -> str:
        sender = gl.message.sender_address
        self.nonce = self.nonce + u256(1)
        # deterministik: address + nonce, tanpa web/LLM jadi aman dari nondet
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
        username = username.strip()
        proof_url = proof_url.strip()

        if platform_norm not in SUPPORTED_PLATFORMS:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Unsupported platform: {platform}. Use one of {SUPPORTED_PLATFORMS}"
            )
        if len(username) == 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} username empty")
        if not (
            proof_url.startswith("http://")
            or proof_url.startswith("https://")
        ):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} proof_url must be http(s)")

        if sender not in self.challenges:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} No challenge. Call request_challenge() first"
            )
        challenge = self.challenges[sender]

        def leader_fn():
            try:
                res = gl.nondet.web.get(proof_url)
            except Exception as e:
                raise gl.vm.UserError(f"{ERROR_TRANSIENT} fetch failed: {e}")

            if res.status != 200:
                if res.status >= 400 and res.status < 500:
                    raise gl.vm.UserError(
                        f"{ERROR_EXTERNAL} proof_url returned {res.status}"
                    )
                raise gl.vm.UserError(
                    f"{ERROR_TRANSIENT} proof_url temporarily unavailable: {res.status}"
                )

            try:
                page_text = res.body.decode("utf-8")[:12000]
            except Exception:
                raise gl.vm.UserError(f"{ERROR_EXTERNAL} cannot decode page body")

            prompt = (
                "You verify social identity proof.\n"
                f"Expected username: {username}\n"
                f"Expected platform: {platform_norm}\n"
                f"Challenge message must appear: {challenge}\n"
                f"Page content:\n{page_text}\n\n"
                'Return JSON only: {"username_match": true/false, '
                '"message_found": true/false, "evidence": "short quote"}'
            )
            analysis = gl.nondet.exec_prompt(prompt, response_format="json")

            if not isinstance(analysis, dict):
                raise gl.vm.UserError(
                    f"{ERROR_LLM} LLM returned non-dict: {type(analysis)}"
                )

            def to_bool(v) -> bool:
                if isinstance(v, bool):
                    return v
                s = str(v).strip().lower()
                return s in ("true", "1", "yes", "y")

            um = analysis.get("username_match", False)
            mf = analysis.get("message_found", False)
            ev = str(analysis.get("evidence", "")[:500])
            return {
                "username_match": to_bool(um),
                "message_found": to_bool(mf),
                "evidence": ev,
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
                    bool(mine["username_match"])
                    == bool(lead["username_match"])
                    and bool(mine["message_found"])
                    == bool(lead["message_found"])
                )
            except Exception:
                return False

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        if not result.get("username_match", False):
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} username not found in proof page"
            )
        if not result.get("message_found", False):
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} challenge message not found in proof page"
            )

        # storage writes HANYA setelah konsensus, di deterministic context
        ident = Identity(
            platform=platform_norm,
            username=username,
            proof_url=proof_url,
            verified_at="verified",
            verifier_note=result.get("evidence", "")[:300],
        )
        is_new = sender not in self.identities
        self.identities[sender] = ident
        if is_new:
            self.verified_list.append(sender)

        return {"verified": True, "username": username, "platform": platform_norm}

    @gl.public.write
    def revoke(self) -> None:
        sender = gl.message.sender_address
        if sender not in self.identities:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} no identity to revoke")
        del self.identities[sender]
