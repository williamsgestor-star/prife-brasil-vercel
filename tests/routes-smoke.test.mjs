import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("routes-smoke", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const runtimeEnv = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const runtimeContext = {
  waitUntil() {},
  passThroughOnException() {},
};

function request(path, init) {
  return worker.fetch(
    new Request(`https://prife-brasil.com${path}`, init),
    runtimeEnv,
    runtimeContext,
  );
}

test("public page and login render successfully", async () => {
  const publicResponse = await request("/");
  assert.equal(publicResponse.status, 200);
  const publicHtml = await publicResponse.text();
  assert.match(publicHtml, /Prife Brasil/i);
  assert.match(publicHtml, /Prospector/i);
  assert.match(publicHtml, /PontoVivo 3D/i);
  assert.match(
    publicHtml,
    /https:\/\/prife-brasil\.com\//,
  );

  const loginResponse = await request("/login");
  assert.equal(loginResponse.status, 200);
  const loginHtml = await loginResponse.text();
  assert.match(loginHtml, /Receber acesso por e-mail/i);
  assert.match(loginHtml, /Seu melhor e-mail/i);
});

test("protected application routes require authentication", async () => {
  for (const path of [
    "/admin/acessos",
    "/admin/empresas",
    "/painel",
    "/leads",
    "/ponto-vivo",
  ]) {
    const response = await request(path, { redirect: "manual" });
    assert.ok([302, 303, 307, 308].includes(response.status), `${path} returned ${response.status}`);
    const location = response.headers.get("location") ?? "";
    assert.match(location, /\/login\?next=/);
    assert.match(decodeURIComponent(location), new RegExp(path.replace("/", "\\/")));
  }
});

test("authentication endpoints reject malformed input without side effects", async () => {
  const otpResponse = await request("/api/auth/otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "invalid", next: "/leads" }),
  });
  assert.equal(otpResponse.status, 400);

  const verifyResponse = await request("/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "invalid", token: "123" }),
  });
  assert.equal(verifyResponse.status, 400);
});

test("anonymous auth context is reported safely", async () => {
  const response = await request("/api/auth/context");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.authenticated, false);
});
