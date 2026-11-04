# Yincord V2

Desktop-only Yincord development build, based on Fluxer. Inside the app the name is Yincord.

This repository stores a pinned upstream revision and our source customizations. GitHub Actions checks out that exact revision, applies the overlay, builds the renderer on Linux, and packages a Windows x64 portable app. No paid build service or local dependency installation is required by this setup; availability depends on this repository's GitHub Actions settings and allowances.

## Status

Experimental; no successful build or runtime verification yet. The existing Sharkord server and accounts are incompatible with this client. Upstream instance endpoints remain until a compatible Yincord backend is configured. Do not represent this build as a working independent Yincord service.

## Build

Open Actions → Build Yincord V2 → Run workflow. The workflow also runs on pushes to main. Download the Windows artifact only after both jobs pass. Native optional addons are disabled for the initial build, so native capture and input-hook features need further work.

## Source and notices

Upstream is pinned in upstream.json. The overlay directory contains modified AGPL files, and scripts/apply.mjs applies additional branding changes. LICENSE retains the upstream AGPL license. All original notices are preserved in the assembled source, which is uploaded with the build. Changing branding does not remove source-distribution obligations.
