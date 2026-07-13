(function () {
  var TIMEOUT_MS = 15000;
  var timeoutId = window.setTimeout(showErrorIfStillBooting, TIMEOUT_MS);

  function isBootComplete() {
    return (
      document.documentElement.getAttribute("data-boot-complete") === "true" ||
      !document.getElementById("boot-splash")
    );
  }

  function clearBootTimeout() {
    if (timeoutId === undefined) {
      return;
    }
    window.clearTimeout(timeoutId);
    timeoutId = undefined;
  }

  function showErrorIfStillBooting() {
    timeoutId = undefined;

    if (isBootComplete()) {
      return;
    }

    var root = document.getElementById("root");
    if (root && root.childElementCount > 0) {
      return;
    }

    var splash = document.getElementById("boot-splash");
    var errorPanel = document.getElementById("boot-splash-error");
    var retryButton = document.getElementById("boot-splash-retry");

    if (!splash || !errorPanel) {
      return;
    }

    splash.classList.add("is-error");
    errorPanel.hidden = false;
    splash.setAttribute("aria-busy", "false");
    splash.setAttribute("aria-label", "Can't connect. Check network and retry.");

    if (retryButton) {
      retryButton.focus();
    }
  }

  function watchBootComplete() {
    if (isBootComplete()) {
      clearBootTimeout();
    }
  }

  document.documentElement.addEventListener("boot-complete", clearBootTimeout);

  new MutationObserver(watchBootComplete).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-boot-complete"],
  });

  var splash = document.getElementById("boot-splash");
  if (splash && splash.parentNode) {
    new MutationObserver(watchBootComplete).observe(splash.parentNode, {
      childList: true,
    });
  }

  var retryButton = document.getElementById("boot-splash-retry");
  if (retryButton) {
    retryButton.addEventListener("click", function () {
      window.location.reload();
    });
  }
})();
