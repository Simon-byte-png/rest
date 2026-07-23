# Hush Apple App

- M1 owns Xcode project, capabilities, Shared Core, platform adapters and integration.
- M2 owns Shared Features, Design System and content-facing UI.
- Windows developers should not edit this directory.
- Feature code depends on Core protocols, not provider implementations.
- App must always support Sample Mode using contract fixtures.
