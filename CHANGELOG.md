# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-09

### Added

- **Dev on Load** - Reload developer extensions once after a configurable delay in seconds, including decimal values.
- **Custom notification** - Choose whether to show a completion toast, its intent, and its message in the settings panel.
- **Reload loop protection** - Avoid repeated reloads when this extension reloads itself, and cancel pending work when disabled.
