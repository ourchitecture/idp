import http from "node:http";
import https from "node:https";
/**
 * HTTP fetch error with status details
 */
export class HttpFetchError extends Error {
    statusCode;
    url;
    bodySnippet;
    constructor(statusCode, url, bodySnippet) {
        super(`HTTP ${statusCode} from ${url}${bodySnippet ? `: ${bodySnippet.slice(0, 200)}` : ""}`);
        this.statusCode = statusCode;
        this.url = url;
        this.bodySnippet = bodySnippet;
        this.name = "HttpFetchError";
    }
}
/**
 * Fetch text from a URL with proper status checking and timeout handling
 * @param url URL to fetch
 * @param timeoutMs Request timeout in milliseconds (default: 10000)
 * @returns Promise resolving to the response body
 * @throws HttpFetchError for non-2xx responses
 */
export function fetchText(url, timeoutMs = 10000) {
    const client = url.protocol === "https:" ? https : http;
    return new Promise((resolve, reject) => {
        const req = client.request(url, { method: "GET", timeout: timeoutMs }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            res.on("end", () => {
                const body = Buffer.concat(chunks).toString("utf-8");
                const statusCode = res.statusCode ?? 0;
                if (statusCode < 200 || statusCode >= 300) {
                    reject(new HttpFetchError(statusCode, url.toString(), body));
                    return;
                }
                resolve(body);
            });
            res.on("error", reject);
        });
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error(`Request timeout after ${timeoutMs}ms for ${url.toString()}`));
        });
        req.end();
    });
}
/**
 * Resolve the BFF base URL from environment
 */
export function resolveBffUrl() {
    const raw = process.env.OUR_IDP_BFF_URL ?? "http://localhost:8000";
    return new URL(raw);
}
/**
 * Apply query parameters to a URL, skipping undefined or empty values
 */
export function applyQuery(url, params) {
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && `${value}`.trim().length > 0) {
            url.searchParams.set(key, `${value}`.trim());
        }
    }
    return url;
}
