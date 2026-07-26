export function removeBootSplash(): void {
  document.getElementById("boot-splash")?.remove();
  document.documentElement.dataset.bootComplete = "true";
  document.documentElement.dispatchEvent(new Event("boot-complete"));
}
