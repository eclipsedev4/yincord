# Lightweight Windows prototype

Uses the shared Microsoft WebView2 Evergreen runtime and .NET Framework already on Windows. The interface is embedded as a compressed ZIP and served from memory through WebView2 resource interception; it is not extracted to disk. Only the small WebView2 SDK loader is extracted. A separate YincordV2Light profile stores new local settings and browser data.

The build rejects an executable larger than 300,000,000 bytes. This limit covers the application, not the shared OS runtime or future account/cache data. Browser cache budgets are set to 16 MB each; profile storage can still grow with use.

This is a prototype, not a feature-parity release. Electron-specific native IPC, global shortcuts, native capture, notification integration and account engine features need separate testing or implementation. The fresh Yincord account backend remains undeployed. No existing accounts or communities are imported.
