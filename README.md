# Yincord V2

Desktop-only Yincord development build, based on Fluxer. Inside the app the name is Yincord.

This repository stores a pinned upstream revision and our source customizations. GitHub Actions checks out that exact revision, applies the overlay, builds the renderer on Linux, and packages a Windows x64 portable app. No paid build service or local dependency installation is required by this setup; availability depends on this repository's GitHub Actions settings and allowances.

## Status

Experimental. The Windows desktop build has passed startup verification on GitHub. The portable launcher expands the app into a temporary folder; the build report records its unpacked size and recommended free space. Release packages exclude JavaScript and CSS debugging source maps.

Yincord will use fresh accounts and fresh communities. No migration or import from the previous app is planned. The independent backend is not deployed yet, and upstream instance endpoints remain in this development client. Do not represent it as a working independent Yincord service.

## Build

Open Actions → Build Yincord V2 → Run workflow. The workflow also runs on pushes to main. Download the Windows artifact only after the Windows startup check passes. Native Windows modules are compiled with Rust and MSVC on the runner. Calls, capture and input hooks need functional testing in addition to the startup check.

For a packaging-only retry, supply the earlier run ID in `renderer_run` and its exact renderer version in `renderer_version`. Leave both blank for a full build. Reuse is appropriate only when changes do not affect compiled renderer or desktop JavaScript. Artifacts named `unverified-debug-build` have failed validation and are for debugging, not release.

## Source and notices

Upstream is pinned in upstream.json. The overlay directory contains modified AGPL files, and scripts/apply.mjs applies additional branding changes. LICENSE retains the upstream AGPL license. All original notices are preserved in the assembled source, which is uploaded with the build. Changing branding does not remove source-distribution obligations.
