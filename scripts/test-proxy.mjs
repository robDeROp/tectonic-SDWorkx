import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { createCloudProxy } from "./proxy-cloud.mjs";

test("authenticated local proxy preserves forms and blocks untrusted origins", async () => {
  let tokenCalls = 0;
  let upstreamCalls = 0;
  const upstream = createServer((req, res) => {
    upstreamCalls++;
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ headers: req.headers, body, path: req.url }));
    });
  }).listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const origin = `http://127.0.0.1:${upstream.address().port}`;
  const proxy = createCloudProxy({
    origin,
    getToken: async () => { tokenCalls++; return "test-token"; },
  }).listen(0, "127.0.0.1");
  await once(proxy, "listening");
  const host = `127.0.0.1:${proxy.address().port}`;
  const call = (headers, body = "{}") => new Promise((resolve, reject) => {
    const req = request(`http://${host}/api/tickets?test=1`, {
      method: "POST", headers: { host, "Content-Type": "application/json", ...headers },
    }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, text }));
    });
    req.on("error", reject);
    req.end(body);
  });
  try {
    const response = await call({
      origin: `http://${host}`,
      authorization: "untrusted-input",
    }, '{"subject":"fictional test"}');
    assert.equal(response.status, 200);
    const data = JSON.parse(response.text);
    assert.equal(data.headers.origin, origin);
    assert.equal(data.headers.authorization, "Bearer test-token");
    assert.equal(data.body, '{"subject":"fictional test"}');
    assert.equal(data.path, "/api/tickets?test=1");
    for (const headers of [
      { origin: "https://evil.example" },
      { origin: "null" },
      { host: "evil.example" },
      { "sec-fetch-site": "cross-site" },
    ]) {
      assert.equal((await call(headers)).status, 403);
    }
    assert.equal(tokenCalls, 1);
    assert.equal(upstreamCalls, 1);
  } finally {
    proxy.closeAllConnections();
    upstream.closeAllConnections();
    await Promise.all([
      new Promise((resolve) => proxy.close(resolve)),
      new Promise((resolve) => upstream.close(resolve)),
    ]);
  }
});
