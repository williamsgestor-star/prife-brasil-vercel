(() => {
  let tries = 0;
  let mounting = false;

  // The public homepage is enhanced by a standalone client application. A
  // client-side Next.js transition back to "/" only renders the SEO fallback
  // and does not restart that application, so every return-to-site link must
  // perform a real document navigation.
  document.addEventListener(
    "click",
    (event) => {
      if (window.location.pathname === "/" || event.defaultPrevented) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link) return;

      const target = link.getAttribute("target");
      const href = link.getAttribute("href");
      if (!href || (target && target !== "_self")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/") return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    },
    true
  );

  const mount = () => {
    if (window.location.pathname !== "/" || mounting) return;
    const node = document.querySelector("#app");
    const hydrated =
      node &&
      Object.keys(node).some(
        (key) => key.startsWith("__reactFiber$") || key.startsWith("__reactProps$")
      );

    if (hydrated || tries++ > 300) {
      mounting = true;
      import("/src/app.js?v=90");
      return;
    }

    window.setTimeout(mount, 16);
  };

  const restoreHomepage = () => {
    if (window.location.pathname !== "/") return;
    window.setTimeout(() => {
      if (document.querySelector("#app .seo-fallback")) {
        window.location.reload();
        return;
      }
      mount();
    }, 0);
  };

  window.addEventListener("popstate", restoreHomepage);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) restoreHomepage();
  });

  mount();
})();
