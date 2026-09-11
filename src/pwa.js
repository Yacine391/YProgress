// Enregistrement du service worker + prise en compte immédiate d'une nouvelle version.
// Sans le updatefound/SKIP_WAITING, l'utilisateur reste sur l'ancien bundle jusqu'à
// la fermeture complète de tous les onglets.

export function initPWA() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // Une nouvelle version est prête et un SW contrôle déjà la page :
            // on l'active tout de suite, le reload est géré par controllerchange.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              installing.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
        registration.update().catch(() => undefined);
      })
      .catch(() => undefined);

    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}
