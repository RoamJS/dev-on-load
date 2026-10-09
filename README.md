# Reload Developer Extensions

<a href="https://roamjs.com/">
    <img src="https://avatars.githubusercontent.com/u/138642184" alt="RoamJS Logo" title="RoamJS" align="right" height="60" />
</a>

**Start your development session with freshly loaded extensions. Reload Developer Extensions automatically reloads all developer extensions after a delay you choose, with an optional custom notification.**

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/RoamJS/reload-developer-extensions)
[![Slack](https://img.shields.io/badge/Slack-%23roam--js-purple)](https://roamresearch.slack.com/archives/C016N2B66JU)

## Features

- Automatically reload all developer extensions once after this extension loads.
- Set the delay in whole seconds and additional milliseconds.
- Choose whether to show a toast, its intent, and its message.
- Prevent repeated automatic reloads when this extension reloads itself.

## Settings

Open **Settings → Roam Depot → Reload Developer Extensions**. The developer version may appear with a **(dev)** suffix.

| Setting              | Default                        | Behavior                                                      |
| -------------------- | ------------------------------ | ------------------------------------------------------------- |
| Delay (seconds)      | 5                              | Whole seconds after this extension loads.                     |
| Delay (milliseconds) | 0                              | Added to seconds: 2 seconds + 500 milliseconds = 2.5 seconds. |
| Show toast           | On                             | Show a notification when the reload finishes or fails.        |
| Toast intent         | success                        | Choose none, primary, success, warning, or danger.            |
| Toast message        | Developer extensions reloaded. | Completion message.                                           |

Settings changes apply on the next full page load. Automatic reload runs once per page load, including when this extension is first enabled. Reloading developer extensions manually does not restart it after it has run. Disabling the extension cancels a pending reload.

Use nonnegative whole numbers for both delay fields. Invalid values use the defaults; very large delays are capped at the browser timer limit (about 24.8 days). An empty toast message uses the default.

The operation uses Roam’s developer extension reload API, so it reloads every registered developer extension. Developer mode and access to the original extension folders are required. If the API is unavailable or rejects the operation, the extension reports the failure in the console and, when enabled, shows a danger toast. It does not automatically retry.
