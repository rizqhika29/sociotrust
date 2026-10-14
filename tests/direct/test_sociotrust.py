"""Direct mode tests for SocioTrustIdentity. Fast, no server (~30ms)."""

import json


def _mock_success(direct_vm, proof_url: str):
    direct_vm.mock_web(
        r".*proof.*|.*gist.*|.*github.*|.*http.*",
        {"status": 200, "body": "<html>testuser SocioTrust verification</html>"},
    )
    direct_vm.mock_llm(
        r".*verify social identity.*",
        json.dumps(
            {
                "username_match": True,
                "message_found": True,
                "evidence": "challenge found in page",
            }
        ),
    )


def test_challenge_then_verify(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    alice_hex = "0x" + bytes(direct_alice).hex()

    challenge = contract.request_challenge()
    assert "SocioTrust verification" in challenge
    assert "nonce 1" in challenge
    assert "0x" in challenge

    _mock_success(direct_vm, "https://gist.github.com/testuser/proof")

    result = contract.verify_identity(
        "github", "testuser", "https://gist.github.com/testuser/proof"
    )
    assert result["verified"] is True

    ident = contract.get_identity(alice_hex)
    assert ident["verified"] is True
    assert ident["username"] == "testuser"
    assert contract.is_verified(alice_hex) is True


def test_verify_without_challenge_reverts(
    direct_vm, direct_deploy, direct_bob
):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("No challenge"):
        contract.verify_identity(
            "github", "bob", "https://gist.github.com/bob/proof"
        )


def test_unsupported_platform_reverts(
    direct_vm, direct_deploy, direct_alice
):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    contract.request_challenge()
    with direct_vm.expect_revert("Unsupported platform"):
        contract.verify_identity(
            "facebook", "testuser", "https://example.com/proof"
        )


def test_revoke(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("sociotrust.py")
    direct_vm.sender = direct_alice
    alice_hex = "0x" + bytes(direct_alice).hex()
    contract.request_challenge()
    _mock_success(direct_vm, "https://gist.github.com/testuser/proof")
    contract.verify_identity(
        "github", "testuser", "https://gist.github.com/testuser/proof"
    )
    assert contract.is_verified(alice_hex) is True

    contract.revoke()
    assert contract.is_verified(alice_hex) is False
