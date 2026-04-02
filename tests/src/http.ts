import http from "node:http";
import https from "node:https";
import type { ResponsePayload } from "./types";

function collectResponse(res: http.IncomingMessage): Promise<ResponsePayload> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    res.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunks.push(buffer);
    });

    res.on("end", () => {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(res.headers)) {
        if (value === undefined) {
          continue;
        }

        headers[key.toLowerCase()] = Array.isArray(value)
          ? value.join(", ")
          : value;
      }

      resolve({
        status: res.statusCode ?? 0,
        headers,
        body: Buffer.concat(chunks).toString("utf-8"),
      });
    });

    res.on("error", reject);
  });
}

export function request(url: URL): Promise<ResponsePayload> {
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(url, { method: "GET" }, (res) => {
      collectResponse(res).then(resolve).catch(reject);
    });

    req.on("error", reject);
    req.end();
  });
}

export function post(
  url: URL,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<ResponsePayload> {
  const client = url.protocol === "https:" ? https : http;
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Content-Length": Buffer.byteLength(payload),
          ...extraHeaders,
        },
      },
      (res) => {
        collectResponse(res).then(resolve).catch(reject);
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
