// Run after a production build: node scripts/linux/http-smoke.mjs
// Uses an isolated loopback server, random temporary credentials and no real DB.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import http from "node:http";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

async function main() {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const password = randomUUID();
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: resolve(import.meta.dirname, "../.."), windowsHide: true,
    env: {
      ...process.env, NODE_ENV: "production", VERCEL: "", VUNDY_LOCAL_HTTP: "1",
      SESSION_SECRET: randomUUID() + randomUUID(),
      OWNER_USERNAME: "__local_smoke_owner__", OWNER_PASSWORD: password,
      STAFF_USERNAME: "__local_smoke_staff__", STAFF_PASSWORD: randomUUID(),
      DATABASE_URL: "mongodb://127.0.0.1:1/vundy_smoke?serverSelectionTimeoutMS=500",
      R2_ACCESS_KEY_ID: "", R2_SECRET_ACCESS_KEY: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let serverOutput = "";
  server.stdout.on("data", data => { serverOutput = (serverOutput + data).slice(-10000); });
  // Do not print server logs or cookies; expected rejected requests are noisy.
  server.stderr.on("data", () => {});
  const request = (path, host, { method = "GET", body = "", headers = {} } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port, path, method, headers: { host, ...headers }, timeout: 10000 }, res => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", part => text += part);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("HTTP smoke test timed out")));
    req.end(body);
  });
  try {
    for (let attempt = 0; attempt < 60 && !serverOutput.includes("Ready in"); attempt++) {
      if (server.exitCode !== null) throw new Error("Smoke server exited. Run a production build first.");
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    const zero = await request("/login?next=%2Fpos", "0.0.0.0:3001");
    assert.equal(zero.status, 307);
    assert.equal(zero.headers.location, "http://localhost:3001/login?next=%2Fpos");
    console.log("PASS: 0.0.0.0 redirects to localhost, preserving external port and query.");

    const lan = await request("/dashboard", "192.168.1.20:3001");
    assert.equal(lan.headers.location, "http://192.168.1.20:3001/login?next=%2Fdashboard");
    console.log("PASS: unauthenticated LAN redirect preserves browser IP and port.");

    const host = `localhost:${port}`;
    const page = await request("/login", host);
    assert.equal(page.status, 200);
    const id = page.text.match(/name="(\$ACTION_ID_[^"]+)"/);
    assert(id, "Rendered login form must expose its Server Action identifier");
    const form = new FormData();
    form.set(id[1], "");
    form.set("username", "__local_smoke_owner__");
    form.set("password", password);
    const payload = new Request("http://localhost", { method: "POST", body: form });
    const body = Buffer.from(await payload.arrayBuffer());
    const headers = {
      origin: `http://${host}`, "content-type": payload.headers.get("content-type"),
      "content-length": body.length
    };
    const login = await request("/login", host, { method: "POST", body, headers });
    assert.equal(login.status, 303);
    assert.equal(login.headers.location, "/dashboard");
    const cookie = (login.headers["set-cookie"] ?? []).find(value => value.startsWith("vl_session="));
    assert(cookie && /HttpOnly/i.test(cookie) && /SameSite=lax/i.test(cookie) && !/;\s*Secure\b/i.test(cookie), "Local session cookie must work on HTTP");
    const signedIn = await request("/login", host, { headers: { cookie: cookie.split(";")[0] } });
    assert.equal(signedIn.headers.location, `http://${host}/dashboard`);
    console.log("PASS: real production login action and local HTTP session cookie work.");

    const lanLogin = await request("/login", "192.168.1.20:3001", {
      method: "POST", body, headers: { ...headers, origin: "http://192.168.1.20:3001" }
    });
    assert.equal(lanLogin.status, 303);
    assert(lanLogin.headers["set-cookie"], "LAN login must issue a session");
    console.log("PASS: real same-origin LAN Server Action works without a CORS wildcard.");

    const csrf = await request("/login", host, {
      method: "POST", body, headers: { ...headers, origin: "http://untrusted.example" }
    });
    assert(csrf.status >= 400, "Cross-origin form must be rejected");
    assert(!csrf.headers["set-cookie"]);
    console.log("PASS: unrelated origins are still rejected by Server Actions.");

    const zeroPost = await request("/login", "0.0.0.0:3001", { method: "POST", body, headers });
    assert.equal(zeroPost.status, 400);
    assert(!zeroPost.headers.location);
    console.log("PASS: form credentials are never replayed from 0.0.0.0 to another host.");

    const logout = await request("/logout", "192.168.1.20:3001", { headers: { cookie: cookie.split(";")[0] } });
    assert.equal(logout.headers.location, "http://192.168.1.20:3001/login");
    console.log("PASS: logout preserves the browser IP/port too.");
  } finally {
    const stopped = new Promise(resolve => server.once("exit", resolve));
    server.kill();
    if (server.exitCode === null) await stopped;
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
