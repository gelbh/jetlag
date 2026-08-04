export interface PwaInstallTipOptions {
  standalone: boolean;
  isIos: boolean;
  isAndroid: boolean;
  canDeferredPrompt: boolean;
}

export function shouldOfferPwaInstallTip(options: PwaInstallTipOptions): boolean {
  if (options.standalone) {
    return false;
  }

  if (options.isIos) {
    return true;
  }

  if (options.isAndroid) {
    return true;
  }

  return options.canDeferredPrompt;
}
