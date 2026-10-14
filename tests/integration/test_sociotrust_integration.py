"""Integration tests for SocioTrustIdentity — full consensus, real web/LLM.

Run: gltest tests/integration/ -v -s --network studionet
Note: studionet is gasless + rate-limited (60 req/min). Keep suite small.
"""

from gltest import get_contract_factory, get_default_account
from gltest.assertions import tx_execution_succeeded, tx_execution_failed


def _factory():
    return get_contract_factory(contract_file_path="sociotrust.py")


def test_deploy_and_request_challenge():
    factory = _factory()
    contract = factory.deploy(args=[])

    tx = contract.request_challenge().transact()
    assert tx_execution_succeeded(tx), f"request_challenge failed: {tx}"

    acct = get_default_account()
    challenge = contract.get_challenge(args=[acct.address]).call()
    assert "SocioTrust verification" in challenge


def test_unsupported_platform_rejects():
    factory = _factory()
    contract = factory.deploy(args=[])
    assert tx_execution_succeeded(contract.request_challenge().transact())

    tx = contract.verify_identity(
        args=["facebook", "someone", "https://example.com/proof"]
    ).transact()
    assert tx_execution_failed(tx), "expected revert for unsupported platform"


def test_verify_rejects_proof_without_challenge():
    """Real web+LLM consensus on the rejection path.

    Uses a stable public page that cannot contain our fresh challenge,
    so leader + validators must agree to reject. Proves the equivalence
    rule works end-to-end on live data.
    """
    factory = _factory()
    contract = factory.deploy(args=[])
    assert tx_execution_succeeded(contract.request_challenge().transact())

    tx = contract.verify_identity(
        args=["github", "genlayerlabs", "https://github.com/genlayerlabs"]
    ).transact()
    assert tx_execution_failed(tx), "expected reject: challenge not on page"

    acct = get_default_account()
    assert contract.is_verified(args=[acct.address]).call() is False
