"""
Pins the GenVM SDK version used by gltest's Direct Mode runner.

gltest defaults to whatever GitHub tag `genvm/releases/latest` resolves to.
At the time this was written that tag (v0.3.0-rc7) is a pre-release with no
`genvm-universal.tar.xz` asset attached, so the default lookup 404s. Pre-
downloading a known-good version here makes it the cached "latest" that
gltest's `list_cached_versions()` picks up, without needing to pass
sdk_version explicitly in every test.

Bump SDK_VERSION once a newer tag is confirmed to ship that asset:
https://github.com/genlayerlabs/genvm/releases
"""
import pytest
from gltest.direct.sdk_loader import download_artifacts

SDK_VERSION = "v0.2.16"


def pytest_configure(config):
    download_artifacts(SDK_VERSION)


@pytest.fixture
def direct_deploy(direct_vm):
    """
    Overrides gltest's own `direct_deploy` fixture to additionally patch
    gl.eq_principle.prompt_non_comparative once the SDK is loaded.

    gltest's Direct Mode WASI shim has no handler for the "ExecPromptTemplate"
    request that prompt_non_comparative issues internally to run its
    leader/validator equivalence prompts (only plain "ExecPrompt" is mocked —
    see gltest/direct/wasi_mock.py). Unhandled request types resolve to the
    "no value" sentinel, so prompt_non_comparative silently returns None
    instead of the leader's answer.

    The patch can only happen *after* a contract has been deployed once,
    because `genlayer` isn't importable until gltest injects the SDK paths
    onto sys.path during deployment — hence overriding direct_deploy rather
    than using a plain autouse fixture.

    For Direct Mode unit tests we only care about validate_action's own
    business logic (parsing, storage, reputation), not GenLayer's consensus
    mechanics — those are exercised separately in Studio Mode integration
    tests against a real network. So here we patch prompt_non_comparative to
    simply run the wrapped fn() and return its result, simulating unanimous
    validator agreement.
    """
    from pathlib import Path
    from gltest.direct.loader import deploy_contract

    def _deploy(contract_path, *args, sdk_version=None, **kwargs):
        path = Path(contract_path)
        if not path.is_absolute() and path.exists():
            path = path.resolve()

        contract = deploy_contract(path, direct_vm, *args, sdk_version=sdk_version, **kwargs)

        import genlayer.gl.eq_principle as eq_principle

        def _passthrough(fn, **_kwargs):
            return fn()

        eq_principle.prompt_non_comparative = _passthrough

        return contract

    return _deploy
