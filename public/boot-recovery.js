(function () {
  var KEY = "jetlag:boot-reload";

  function shouldRecover(message) {
    return (
      message.indexOf("Importing a module script failed") !== -1 ||
      message.indexOf("Failed to fetch dynamically imported module") !== -1 ||
      message.indexOf("text/html") !== -1 ||
      message.indexOf("MIME type") !== -1
    );
  }

  window.addEventListener(
    "error",
    function (event) {
      var message = String(event.message || "");
      if (!shouldRecover(message)) {
        return;
      }

      try {
        if (sessionStorage.getItem(KEY) === "1") {
          return;
        }
        sessionStorage.setItem(KEY, "1");
      } catch (_error) {
        // sessionStorage may be unavailable.
      }

      window.location.reload();
    },
    true,
  );
})();
