// Minimal zero-dependency REST API for the Third-Party Risk & Oversight Platform.
// Serves the JSON spec (../spec) as the source of truth over HTTP on :3001 and
// supports basic CRUD held in memory. The frontend falls back to seeded data
// when this server is not running.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = join(__dirname, "..", "spec");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// Resources are exposed at /api/<resource> and seeded from spec/<file>.json.
const RESOURCES = {
  controls: "controls.json",
  cases: "cases.json",
  "reg-changes": "reg-changes.json",
};

const ID_PREFIX = {
  controls: "ctrl",
  cases: "case",
  "reg-changes": "reg",
};

/** In-memory store, seeded once at startup from the spec files. */
const store = {};
for (const [resource, file] of Object.entries(RESOURCES)) {
  store[resource] = JSON.parse(readFileSync(join(SPEC_DIR, file), "utf8"));
}

function nextId(resource) {
  const prefix = ID_PREFIX[resource];
  const max = store[resource].reduce((acc, item) => {
    const n = Number.parseInt(String(item.id).split("-")[1] ?? "0", 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function send(res, status, body) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean); // ["api", resource, id?]

  if (parts[0] === "api" && parts[1] === "health") {
    return send(res, 200, { status: "ok", resources: Object.keys(RESOURCES) });
  }

  if (parts[0] !== "api" || !RESOURCES[parts[1]]) {
    return send(res, 404, { error: "Not found" });
  }

  const resource = parts[1];
  const id = parts[2];
  const collection = store[resource];

  try {
    if (req.method === "GET" && !id) return send(res, 200, collection);

    if (req.method === "GET" && id) {
      const item = collection.find((x) => x.id === id);
      return item ? send(res, 200, item) : send(res, 404, { error: "Not found" });
    }

    if (req.method === "POST" && !id) {
      const body = await readBody(req);
      const created = { ...body, id: body.id || nextId(resource) };
      collection.push(created);
      return send(res, 201, created);
    }

    if (req.method === "PUT" && id) {
      const idx = collection.findIndex((x) => x.id === id);
      if (idx === -1) return send(res, 404, { error: "Not found" });
      const body = await readBody(req);
      collection[idx] = { ...collection[idx], ...body, id };
      return send(res, 200, collection[idx]);
    }

    if (req.method === "DELETE" && id) {
      const idx = collection.findIndex((x) => x.id === id);
      if (idx === -1) return send(res, 404, { error: "Not found" });
      const [removed] = collection.splice(idx, 1);
      return send(res, 200, removed);
    }

    return send(res, 405, { error: "Method not allowed" });
  } catch (err) {
    return send(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`TPRM API listening on http://localhost:${PORT}/api`);
  console.log(`Resources: ${Object.keys(RESOURCES).join(", ")}`);
});
