"""Integration tests for SocioTrustIdentity v2 — full consensus, real web calls.

Run: gltest tests/integration/ -v -s --network studionet
Note: studionet is gasless + rate-limited (60 req/min). Keep suite small.

Positive-path live verification requires a real GitHub gist owned by the
tester containing a FRESH challenge, so it is exercised manually (see README)
and via direct-mode mocks. These tests validate deploy, deterministic
rejections, and live consensus on the GitHub-API error paths.
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


def test_non_github_platform_rejects():
    factory = _factory()
    contract = factory.deploy(args=[])
    assert tx_execution_succeeded(contract.request_challenge().transact())

    tx = contract.verify_identity(
        args=["blog", "someone", "https://example.com/proof"]
    ).transact()
    assert tx_execution_failed(tx), "expected revert: only github is supported"


def test_non_gist_url_rejects():
    factory = _factory()
    contract = factory.deploy(args=[])
    assert tx_execution_succeeded(contract.request_challenge().transact())

    tx = contract.verify_identity(
        args=["github", "octocat", "https://paste.rs/abc123"]
    ).transact()
    assert tx_execution_failed(tx), "expected revert: not a gist URL"


def test_missing_gist_rejects_live():
    """Live consensus on the GitHub API 404 path (all-zeros gist id)."""
    factory = _factory()
    contract = factory.deploy(args=[])
    assert tx_execution_succeeded(contract.request_challenge().transact())

    fake_id = "0" * 32
    tx = contract.verify_identity(
        args=["github", "octocat", f"https://gist.github.com/octocat/{fake_id}"]
    ).transact()
    assert tx_execution_failed(tx), "expected reject: gist does not exist"

    acct = get_default_account()
    assert contract.is_verified(args=[acct.address]).call() is False
    assert contract.owner_of(args=["github", "octocat"]).call() == ""
