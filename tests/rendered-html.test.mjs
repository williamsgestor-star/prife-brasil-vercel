import assert from "node:assert/strict";
import test from "node:test";

test("renders production SEO, indexable content and security headers", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>Prife Brasil \| Tecnologias de bem-estar e oportunidade<\/title>/i);
  assert.match(html, /rel="canonical"/i);
  assert.match(
    html,
    /https:\/\/www\.prife-brasil\.com\//,
  );
  assert.match(html, /\/favicon-32\.png/i);
  assert.match(html, /property="og:title"/i);
  assert.match(html, /application\/ld\+json/i);
  assert.match(html, /FAQPage/i);
  assert.match(html, /\/privacidade/i);
  assert.match(html, /O que hoje desperta/i);
  assert.match(html, /iTeraCare Classic Plus/i);
  assert.match(html, /Assistente iTERA/i);
  assert.match(html, /\/assistant\/itera-assistant-alpha-v7\.webm/i);
  assert.doesNotMatch(
    html,
    /Informações institucionais e de alcance internacional conforme materiais fornecidos/i,
  );
  assert.doesNotMatch(html, /codex-preview/i);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /connect-src 'self' https:\/\/jmingbhpyyfsganoougf\.supabase\.co wss:\/\/jmingbhpyyfsganoougf\.supabase\.co/,
  );
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /img-src 'self' data: https:\/\/jmingbhpyyfsganoougf\.supabase\.co/,
  );
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /media-src 'self' blob: https:\/\/jmingbhpyyfsganoougf\.supabase\.co/,
  );
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /frame-src https:\/\/www\.youtube\.com https:\/\/www\.youtube-nocookie\.com https:\/\/player\.vimeo\.com https:\/\/\*\.daily\.co/,
  );
  assert.match(
    response.headers.get("permissions-policy") ?? "",
    /camera=\(self "https:\/\/\*\.daily\.co"\), microphone=\(self "https:\/\/\*\.daily\.co"\)/,
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
});
