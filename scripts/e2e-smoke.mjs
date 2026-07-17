#!/usr/bin/env node
/**
 * API smoke tests for CMS prototype.
 * Run with backend on http://localhost:8055
 */
const BASE = process.env.API_URL ?? 'http://localhost:8055';
const ADMIN = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const PASS = process.env.ADMIN_PASSWORD ?? 'admin';

const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, message });
    console.error(`✗ ${name}: ${message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => null);
  return { res, body };
}

async function authed(path, token, options = {}) {
  return json(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

let token = '';

await test('health check', async () => {
  const { res, body } = await json('/server/health');
  assert(res.ok, `status ${res.status}`);
  assert(body?.data?.status === 'ok', 'health not ok');
  assert(body?.data?.db === 'connected', 'db not connected');
});

await test('login', async () => {
  const { res, body } = await json('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN, password: PASS }),
  });
  assert(res.ok, `login failed ${res.status}: ${JSON.stringify(body)}`);
  token = body?.data?.access_token ?? '';
  assert(token.length > 20, 'missing access_token');
});

await test('list collections', async () => {
  const { res, body } = await authed('/api/collections', token);
  assert(res.ok, `status ${res.status}`);
  const collections = body?.data ?? [];
  assert(Array.isArray(collections) && collections.length > 0, 'no collections');
  const names = collections.map((c) => c.collection);
  for (const required of ['pages', 'hero_banners', 'site_header', 'site_footer']) {
    assert(names.includes(required), `missing collection ${required}`);
  }
});

await test('list pages (authenticated)', async () => {
  const { res, body } = await authed('/api/items/pages?limit=10', token);
  assert(res.ok, `status ${res.status}`);
  assert(Array.isArray(body?.data), 'pages not array');
  assert(body.data.length > 0, 'no pages seeded');
});

await test('home page has sections', async () => {
  const { res, body } = await authed('/api/items/pages?limit=20&filter[slug][_eq]=home', token);
  assert(res.ok, `status ${res.status}`);
  const page = body?.data?.[0];
  assert(page, 'home page missing');
  const sections = typeof page.sections === 'string' ? JSON.parse(page.sections) : page.sections;
  assert(Array.isArray(sections) && sections.length > 0, 'home page has no sections');
});

await test('hero_banners items load', async () => {
  const { res, body } = await authed('/api/items/hero_banners?limit=5', token);
  assert(res.ok, `status ${res.status}`);
  assert(Array.isArray(body?.data), 'hero_banners not array');
});

await test('site_header fields include nav_links repeater', async () => {
  const { res, body } = await authed('/api/collections/site_header/fields', token);
  assert(res.ok, `status ${res.status}`);
  const nav = (body?.data ?? []).find((f) => f.field === 'nav_links');
  assert(nav, 'nav_links field missing');
  assert(nav.interface === 'repeater', `nav_links interface is ${nav.interface}`);
});

await test('pages sections field is many-to-any', async () => {
  const { res, body } = await authed('/api/collections/pages/fields', token);
  assert(res.ok, `status ${res.status}`);
  const sections = (body?.data ?? []).find((f) => f.field === 'sections');
  assert(sections, 'sections field missing');
  assert(sections.interface === 'many-to-any', `sections interface is ${sections.interface}`);
});

await test('policies list', async () => {
  const { res, body } = await authed('/api/policies', token);
  assert(res.ok, `status ${res.status}`);
  assert(Array.isArray(body?.data) && body.data.length > 0, 'no policies');
});

await test('users list', async () => {
  const { res, body } = await authed('/users', token);
  assert(res.ok, `status ${res.status}`);
  assert(Array.isArray(body?.data) && body.data.length > 0, 'no users');
});

await test('languages for translations', async () => {
  const { res, body } = await authed('/api/items/languages?limit=10', token);
  assert(res.ok, `status ${res.status}`);
  assert(Array.isArray(body?.data) && body.data.length >= 1, 'no languages');
});

await test('create and delete test paragraph', async () => {
  const { res: createRes, body: created } = await authed('/api/items/paragraphs', token, {
    method: 'POST',
    body: JSON.stringify({
      label: 'E2E Smoke Test',
      body: '<p>Automated smoke test paragraph</p>',
      status: 'draft',
    }),
  });
  assert(createRes.ok, `create failed ${createRes.status}`);
  const id = created?.data?.id;
  assert(id, 'no id returned');

  const { res: getRes, body: item } = await authed(`/api/items/paragraphs/${id}`, token);
  assert(getRes.ok, 'fetch created item failed');
  assert(item?.data?.label === 'E2E Smoke Test', 'label mismatch');

  const { res: delRes } = await authed(`/api/items/paragraphs/${id}`, token, { method: 'DELETE' });
  assert(delRes.ok, `delete failed ${delRes.status}`);
});

await test('unauthorized request rejected', async () => {
  const { res } = await json('/api/collections');
  assert(res.status === 401, `expected 401 got ${res.status}`);
});

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log('\n---');
console.log(`API smoke: ${passed}/${results.length} passed`);
if (failed.length > 0) {
  console.log('\nFailures:');
  for (const f of failed) console.log(`  - ${f.name}: ${f.message}`);
  process.exit(1);
}
