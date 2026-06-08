#!/usr/bin/env node
// 🎭 mockmaster — Zero-config Mock API Server

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { URL } = require('url');

const GREEN  = '\x1b[32m'; const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m'; const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';  const DIM    = '\x1b[2m';
const NC     = '\x1b[0m';

// ── Fake data generators ──────────────────────────────────
const NAMES   = ['Alice Chen','Bob Martinez','Carol Kim','David Okonkwo','Emma Wilson','Finn O\'Brien','Grace Liu','Henry Patel'];
const DOMAINS = ['gmail.com','yahoo.com','outlook.com','proton.me','icloud.com'];
const WORDS   = ['alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel'];

const fakers = {
  id:          (i) => i + 1,
  name:        ()  => NAMES[Math.floor(Math.random() * NAMES.length)],
  email:       ()  => `${WORDS[Math.floor(Math.random()*WORDS.length)]}@${DOMAINS[Math.floor(Math.random()*DOMAINS.length)]}`,
  title:       ()  => WORDS.slice(0,3).sort(() => Math.random()-0.5).join(' '),
  description: ()  => WORDS.sort(() => Math.random()-0.5).slice(0,6).join(' '),
  price:       ()  => (Math.random() * 200 + 5).toFixed(2),
  count:       ()  => Math.floor(Math.random() * 100),
  status:      ()  => ['active','inactive','pending'][Math.floor(Math.random()*3)],
  createdAt:   ()  => new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
  updatedAt:   ()  => new Date().toISOString(),
  uuid:        ()  => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  }),
};

function generateItem(schema, index = 0) {
  if (!schema || typeof schema !== 'object') return {};
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return generateItem({ type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } }, index);
  }
  if (schema.type === 'array') return Array.from({ length: 3 }, (_, i) => generateItem(schema.items, i));

  const result = {};
  for (const [key, def] of Object.entries(schema.properties || {})) {
    if (fakers[key])             result[key] = fakers[key](index);
    else if (def.type === 'integer' || def.type === 'number') result[key] = Math.floor(Math.random() * 1000) + index;
    else if (def.type === 'boolean')  result[key] = Math.random() > 0.5;
    else if (def.type === 'array')    result[key] = [];
    else if (def.enum)                result[key] = def.enum[Math.floor(Math.random() * def.enum.length)];
    else                              result[key] = `${key}-${index + 1}`;
  }
  return result;
}

// ── Route matching ────────────────────────────────────────
function matchRoute(pathname, routes) {
  for (const route of routes) {
    const pattern = route.path.replace(/\{[^}]+\}/g, '([^/]+)');
    const re      = new RegExp(`^${pattern}$`);
    const match   = pathname.match(re);
    if (match) return { route, params: match.slice(1) };
  }
  return null;
}

function buildRoutes(spec) {
  const routes = [];
  for (const [routePath, methods] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (!op || typeof op !== 'object') continue;
      const schema200 = op.responses?.['200']?.content?.['application/json']?.schema
                     || op.responses?.['201']?.content?.['application/json']?.schema;
      routes.push({ path: routePath, method: method.toUpperCase(), op, schema: schema200 });
    }
  }
  return routes;
}

// ── Request logger ────────────────────────────────────────
function logRequest(method, pathname, status, ms) {
  const color  = status >= 500 ? RED : status >= 400 ? YELLOW : GREEN;
  const mColor = method === 'GET' ? CYAN : method === 'POST' ? GREEN : method === 'DELETE' ? RED : YELLOW;
  console.log(`${mColor}${method.padEnd(7)}${NC} ${pathname.padEnd(30)} ${color}→ ${status}${NC}  ${DIM}[${ms}ms]${NC}`);
}

function startServer(spec, port = 3001, delay = 0) {
  const routes = buildRoutes(spec);
  const store  = {}; // in-memory store per resource

  const server = http.createServer((req, res) => {
    const start    = Date.now();
    const url      = new URL(req.url, `http://localhost:${port}`);
    const pathname = url.pathname;
    const method   = req.method;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const matched = matchRoute(pathname, routes.filter(r => r.method === method));

    setTimeout(() => {
      if (!matched) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found', path: pathname }));
        logRequest(method, pathname, 404, Date.now() - start);
        return;
      }

      const { route } = matched;
      const resource  = pathname.split('/').filter(Boolean)[1] || 'items';
      if (!store[resource]) store[resource] = Array.from({ length: 3 }, (_, i) => generateItem(route.schema, i));

      let status = 200;
      let body;

      if (method === 'GET' && !pathname.match(/\/\w+\/[\w-]+$/)) {
        body = store[resource];
      } else if (method === 'GET') {
        const id   = pathname.split('/').pop();
        const item = store[resource].find(i => String(i.id) === id);
        body = item || { error: 'Not found' };
        if (!item) status = 404;
      } else if (method === 'POST') {
        const newItem = generateItem(route.schema, store[resource].length);
        store[resource].push(newItem);
        body   = newItem;
        status = 201;
      } else if (method === 'DELETE') {
        body = {};
        status = 204;
      } else {
        body = generateItem(route.schema, 0);
      }

      res.writeHead(status);
      res.end(status === 204 ? '' : JSON.stringify(body, null, 2));
      logRequest(method, pathname, status, Date.now() - start);
    }, delay);
  });

  server.listen(port, () => {
    console.log(`\n${CYAN}${BOLD}🎭 mockmaster — serving on http://localhost:${port}${NC}`);
    console.log(`${DIM}Routes: ${routes.length}  │  Delay: ${delay}ms  │  Ctrl+C to stop${NC}\n`);
    console.log('─'.repeat(55));
  });
}

// ── Demo spec ─────────────────────────────────────────────
const DEMO_SPEC = {
  paths: {
    '/api/users':     { get: { responses: { '200': { content: { 'application/json': { schema: { type: 'array', items: { properties: { id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string' }, status: { type: 'string' }, createdAt: { type: 'string' } } } } } } } } }, post: { responses: { '201': { content: { 'application/json': { schema: { properties: { id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string' } } } } } } } } },
    '/api/users/{id}':{ get: { responses: { '200': { content: { 'application/json': { schema: { properties: { id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string' } } } } } } } }, delete: { responses: { '204': {} } } },
    '/api/products':  { get: { responses: { '200': { content: { 'application/json': { schema: { type: 'array', items: { properties: { id: { type: 'integer' }, title: { type: 'string' }, price: { type: 'number' } } } } } } } } } },
  },
};

const args  = process.argv.slice(2);
const cmd   = args[0] || 'demo';
const port  = parseInt(args[args.indexOf('--port') + 1]) || 3001;
const delay = parseInt(args[args.indexOf('--delay')+ 1]) || 0;

console.log(`\n${CYAN}${BOLD}🎭 mockmaster${NC}\n`);

if (cmd === 'demo' || cmd === 'serve') {
  let spec = DEMO_SPEC;
  if (cmd === 'serve' && args[1] && fs.existsSync(args[1])) {
    spec = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  }
  startServer(spec, port, delay);
} else if (cmd === 'generate' && args[1]) {
  const spec = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  const routes = buildRoutes(spec);
  console.log(`${BOLD}Generated responses preview:${NC}\n`);
  routes.slice(0, 5).forEach(r => {
    const sample = r.schema ? generateItem(r.schema) : {};
    console.log(`  ${CYAN}${r.method} ${r.path}${NC}`);
    console.log(`  ${DIM}${JSON.stringify(sample).slice(0, 80)}${NC}\n`);
  });
} else {
  console.log(`Usage:`);
  console.log(`  node src/server.js demo                          # demo server on :3001`);
  console.log(`  node src/server.js serve openapi.json --port 3001`);
  console.log(`  node src/server.js serve openapi.json --delay 200`);
  console.log(`  node src/server.js generate openapi.json\n`);
}
