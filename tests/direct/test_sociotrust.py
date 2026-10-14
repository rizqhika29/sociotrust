"""Direct mode tests for SocioTrustIdentity v2 (authoritative gist binding)."""

import json

GIST_ID = "a" * 32
GIST_URL = f"https://gist.github.com/octocat/{GIST_ID}"


def _mock_gist(direct_vm, owner_login, files_content, status=200):
    body = json.dumps(
        {
            "id": GIST_ID,
            "owner": {"login": owner_login} if owner_login else None,
            "files": {"proof.txt": {"content": files_content}},
        }
    )
    direct_vm.mock_web(
        r".*api\.github\.com/gists.*",
        {"status": status, "body": body},
    )


def _challenge_of(contract, direct_vm, user_hex):
    ch = contract.get_challenge(user_hex)
    assert "SocioTrust verification" in ch
    return ch


def test_challenge_then_verify_success(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    alice_hex = "0x" + bytes(direct_alice).hex()

    challenge = contract.request_challenge()
    assert "nonce 1" in challenge

    _mock_gist(direct_vm, "octocat", f"hello\n{challenge}\n")
    result = contract.verify_identity("github", "octocat", GIST_URL)
    assert result["verified"] is True

    ident = contract.get_identity(alice_hex)
    assert ident["username"] == "octocat"
    assert ident["gist_id"] == GIST_ID
    assert contract.is_verified(alice_hex) is True
    assert contract.owner_of("github", "octocat") == contract.owner_of(
        "github", "OctoCat"
    )  # case-insensitive key


def test_owner_mismatch_reverts(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    contract.request_challenge()
    ch = contract.get_challenge("0x" + bytes(direct_alice).hex())

    _mock_gist(direct_vm, "someone-else", f"proof {ch}")
    with direct_vm.expect_revert("does not match"):
        contract.verify_identity("github", "octocat", GIST_URL)


def test_anonymous_gist_reverts(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    contract.request_challenge()
    ch = contract.get_challenge("0x" + bytes(direct_alice).hex())

    _mock_gist(direct_vm, None, f"proof {ch}")
    with direct_vm.expect_revert("anonymous gist"):
        contract.verify_identity("github", "octocat", GIST_URL)


def test_missing_challenge_in_gist_reverts(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    contract.request_challenge()

    _mock_gist(direct_vm, "octocat", "unrelated content")
    with direct_vm.expect_revert("not found in gist"):
        contract.verify_identity("github", "octocat", GIST_URL)


def test_gist_404_reverts(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    contract.request_challenge()

    _mock_gist(direct_vm, "octocat", "", status=404)
    with direct_vm.expect_revert("not found"):
        contract.verify_identity("github", "octocat", GIST_URL)


def test_uniqueness_second_wallet_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("sociotrust.py")

    direct_vm.sender = direct_alice
    ch_a = contract.request_challenge()
    _mock_gist(direct_vm, "octocat", f"proof {ch_a}")
    contract.verify_identity("github", "octocat", GIST_URL)

    # Same identity, different wallet -> rejected.
    direct_vm.sender = direct_bob
    direct_vm.clear_mocks()
    ch_b = contract.request_challenge()
    _mock_gist(direct_vm, "octocat", f"proof {ch_b}")
    with direct_vm.expect_revert("already sealed"):
        contract.verify_identity("github", "octocat", GIST_URL)

    bob_hex = "0x" + bytes(direct_bob).hex()
    assert contract.is_verified(bob_hex) is False


def test_same_wallet_refresh_allowed(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    alice_hex = "0x" + bytes(direct_alice).hex()

    ch1 = contract.request_challenge()
    _mock_gist(direct_vm, "octocat", f"proof {ch1}")
    contract.verify_identity("github", "octocat", GIST_URL)

    ch2 = contract.request_challenge()
    assert ch2 != ch1
    direct_vm.clear_mocks()
    _mock_gist(direct_vm, "octocat", f"proof {ch2}")
    result = contract.verify_identity("github", "octocat", GIST_URL)
    assert result["verified"] is True
    assert len(contract.list_verified()) == 1


def test_revoke_releases_claim(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    ch_a = contract.request_challenge()
    _mock_gist(direct_vm, "octocat", f"proof {ch_a}")
    contract.verify_identity("github", "octocat", GIST_URL)
    contract.revoke()

    direct_vm.sender = direct_bob
    direct_vm.clear_mocks()
    ch_b = contract.request_challenge()
    _mock_gist(direct_vm, "octocat", f"proof {ch_b}")
    result = contract.verify_identity("github", "octocat", GIST_URL)
    assert result["verified"] is True


def test_non_github_platform_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    contract.request_challenge()
    with direct_vm.expect_revert("Only 'github'"):
        contract.verify_identity("blog", "octocat", "https://example.com/proof")


def test_non_gist_url_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    contract.request_challenge()
    with direct_vm.expect_revert("gist"):
        contract.verify_identity("github", "octocat", "https://paste.rs/abc123")


def test_verify_without_challenge_reverts(direct_vm, direct_deploy, direct_bob):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("No challenge"):
        contract.verify_identity("github", "bob", GIST_URL)
