"use client";

import { useEffect } from "react";

export default function AppBootstrap() {
  useEffect(() => {
    if (document.querySelector("script[data-prife-app]")) return;

    const script = document.createElement("script");
    script.type = "module";
    script.src = "/src/app.js?v=115";
    script.dataset.prifeApp = "true";
    document.body.appendChild(script);
  }, []);

  return null;
}
