import type { ReloadConfig, ToastIntent } from "~/utils/settings";
export type ReloadSession = { attempted: boolean };
type Notification = { message: string; intent: ToastIntent };
export const scheduleReload = ({
  session,
  config,
  reload,
  notify,
  reportError,
}: {
  session: ReloadSession;
  config: ReloadConfig;
  reload: () => Promise<unknown>;
  notify: (notification: Notification) => void;
  reportError: (error: unknown) => void;
}): (() => void) => {
  if (session.attempted) return (): void => {};
  const timer = setTimeout(async (): Promise<void> => {
    if (session.attempted) return;
    // Set before calling Roam: reloading also unloads/reloads this extension.
    session.attempted = true;
    try {
      await reload();
    } catch (error) {
      reportError(error);
      if (config.showToast) {
        notify({
          message:
            "Developer extensions could not be reloaded. See the console for details.",
          intent: "danger",
        });
      }
      return;
    }
    // Self-unload during the reload must not suppress its completion toast.
    if (config.showToast)
      notify({ message: config.toastMessage, intent: config.toastIntent });
  }, config.delayMs);
  return (): void => clearTimeout(timer);
};
