import { isAndroidDevice, isIosDevice } from "../../../domain/device/pwa/detectMobilePlatform";
import { PWA_INSTALL_TIP_DISMISS_KEY } from "../../../domain/device/pwa/pwaInstallTipStorage";
import { isStandalonePwa } from "../../../domain/device/pwa/isStandalonePwa";
import { shouldOfferPwaInstallTip } from "../../../domain/device/pwa/shouldOfferPwaInstallTip";
import { usePersistedDismiss } from "../../../hooks/forms/usePersistedDismiss";
import { usePwaDeferredInstallPrompt } from "../../../hooks/pwa/usePwaDeferredInstallPrompt";
import { HudBanner } from "../hud/HudBanner";

export function PwaInstallTipBanner() {
  const { dismissed, dismiss } = usePersistedDismiss(PWA_INSTALL_TIP_DISMISS_KEY);
  const { canDeferredPrompt, promptInstall } = usePwaDeferredInstallPrompt();

  const standalone = isStandalonePwa();
  const isIos = isIosDevice();
  const isAndroid = isAndroidDevice();

  const visible =
    !dismissed &&
    shouldOfferPwaInstallTip({
      standalone,
      isIos,
      isAndroid,
      canDeferredPrompt,
    });

  if (!visible) {
    return null;
  }

  const title = isIos ? "Add to Home Screen" : "Install Jetlag";
  const body = isIos
    ? "Tap Share, then Add to Home Screen for full-screen play on game day."
    : canDeferredPrompt
      ? "Install the app for faster launch and no browser chrome during hunts."
      : "Open the Chrome menu and choose Install app or Add to Home screen.";

  return (
    <HudBanner
      visible
      className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-banner)] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div
        className="pointer-events-auto hud-panel mx-auto flex max-w-md flex-col gap-2 px-3 py-2.5"
        role="dialog"
        aria-labelledby="pwa-install-tip-title"
        aria-describedby="pwa-install-tip-body"
      >
        <p
          id="pwa-install-tip-title"
          className="font-display text-xs font-semibold uppercase tracking-wide text-ink"
        >
          {title}
        </p>
        <p
          id="pwa-install-tip-body"
          className="text-pretty text-sm leading-snug text-ink-muted"
        >
          {body}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-secondary min-h-11 px-4 text-xs"
            onClick={dismiss}
          >
            Not now
          </button>
          {isAndroid && canDeferredPrompt ? (
            <button
              type="button"
              className="btn-primary min-h-11 px-4 text-xs"
              onClick={() => {
                void promptInstall().then((accepted) => {
                  if (accepted) {
                    dismiss();
                  }
                });
              }}
            >
              Install
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary min-h-11 px-4 text-xs"
              onClick={dismiss}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </HudBanner>
  );
}
