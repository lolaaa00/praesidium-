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
from gltest.direct.sdk_loader import download_artifacts

SDK_VERSION = "v0.2.16"


def pytest_configure(config):
    download_artifacts(SDK_VERSION)
