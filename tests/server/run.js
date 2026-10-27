const assert = require('node:assert/strict');
const { once } = require('node:events');
const coach = require('../../server/coach');
const { healthHandler } = require('../../server/health');
const { createServer } = require('../../server/index');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9z8AAAAASUVORK5CYII=';
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const resMock = () => ({ statusCode: 200, headers: {}, body: null, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const reqMock = body => ({ method: 'POST', body, headers: {}, socket: { remoteAddress: 'test' } });
const originalFetch = global.fetch;
const originalKey = process.env.OPENROUTER_API_KEY;
const originalModel = process.env.OPENROUTER_MODEL;
const originalVisionModel = process.env.OPENROUTER_VISION_MODEL;
const fakeResponse = (content, status = 200) => ({ ok: status < 400, status, json: async () => status < 400 ? { choices: [{ message: { content } }] } : { error: { message: 'secret must not leak' } } });

test('question and bounded context survive validation', () => {
  const p = coach.validatePayload({ message: 'Je suis fatigué, que faire ?', context: { profile: { weight: 57 }, planned: [{ name: 'Squat' }] } });
  assert.equal(p.message, 'Je suis fatigué, que faire ?'); assert.equal(p.profile.weight, 57); assert.equal(p.planned.length, 1);
  assert.throws(() => coach.validatePayload({ context: { text: 'x'.repeat(50001) } }), /PAYLOAD_TOO_LARGE/);
});
test('photos are validated by MIME, base64, signature and decoded size', () => {
  assert.equal(coach.validatePayload({ mode: 'meal', imageDataUrl: png }).imageDataUrl, png);
  assert.throws(() => coach.validatePayload({ mode: 'label' }), /IMAGE_REQUIRED/);
  for (const bad of ['https://example.com/photo.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,aGVsbG8=', png + '!']) {
    assert.throws(() => coach.validatePayload({ mode: 'meal', imageDataUrl: bad }), /INVALID_IMAGE/);
  }
  const large = Buffer.alloc(coach.MAX_IMAGE_BYTES + 1); large.set([255, 216, 255]);
  assert.throws(() => coach.validatePayload({ imageDataUrl: 'data:image/jpeg;base64,' + large.toString('base64') }), /IMAGE_TOO_LARGE/);
});
test('invalid portion and mode rejected', () => {
  assert.throws(() => coach.validatePayload({ mode: 'unknown' }), /INVALID_MODE/);
  for (const portionGrams of [0, -1, 'many', 5001]) assert.throws(() => coach.validatePayload({ portionGrams }), /INVALID_PORTION/);
});
test('unknown nutrition never becomes zero', () => {
  const r = coach.parseNutrition(JSON.stringify({ reply: 'Tableau illisible.', nutrition: { calories: null, protein: '', carbs: false, fat: -2, basis: 'unknown', confidence: 'high' } }));
  for (const k of ['calories', 'protein', 'carbs', 'fat']) assert.equal(r.nutrition[k], null);
  assert.throws(() => coach.parseNutrition('Ce n’est pas du JSON'), /COACH_BAD_RESPONSE/);
});
test('100 g label converted deterministically only with known portion', () => {
  const data = { reply: 'Valeurs lues', nutrition: { calories: 400, protein: 80, carbs: null, fat: 5, basis: 'per100g', confidence: 'high', notes: '' } };
  const r = coach.applyPortion(coach.parseNutrition(JSON.stringify(data)), { mode: 'label', portionGrams: 30 });
  assert.equal(r.nutrition.calories, 120); assert.equal(r.nutrition.protein, 24); assert.equal(r.nutrition.fat, 1.5); assert.equal(r.nutrition.carbs, null);
  assert.equal(r.nutrition.portionGrams, 30); assert.equal(r.nutrition.basis, 'portion'); assert.equal(r.nutrition.per100g.protein, 80);
});
test('photo estimate cannot report high confidence', () => {
  const r = coach.applyPortion({ nutrition: { basis: 'portion', confidence: 'high' } }, { mode: 'meal', portionGrams: null });
  assert.equal(r.nutrition.confidence, 'medium');
});
test('health distinguishes configuration from an actually verified provider', () => {
  process.env.OPENROUTER_API_KEY = '';
  const missing = resMock(); healthHandler({}, missing); assert.equal(missing.body.coach.status, 'MISSING_KEY');
  process.env.OPENROUTER_API_KEY = 'sk-or-v1-' + 'z'.repeat(40);
  const configured = resMock(); healthHandler({}, configured);
  assert.equal(configured.body.coach.status, 'CONFIGURED_NOT_TESTED'); assert.equal(configured.body.coach.liveVerified, false);
  assert(!JSON.stringify(configured.body).includes('zzzz'));
});
test('missing key returns explicit 503 and never contacts provider', async () => {
  process.env.OPENROUTER_API_KEY = ''; coach.limiter.reset();
  global.fetch = async () => { throw new Error('Must not call'); };
  const res = resMock(); await coach.coachHandler(reqMock({ message: 'Salut' }), res);
  assert.equal(res.statusCode, 503); assert.equal(res.body.error, 'MISSING_KEY');
});
test('chat question is actually sent to the provider, no image invented', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-or-v1-' + 'z'.repeat(40); coach.limiter.reset();
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body); assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert(body.messages[1].content.includes('Fatigué après le stage')); assert.equal(typeof body.messages[1].content, 'string');
    assert(opts.headers.Authorization.startsWith('Bearer ')); assert(opts.signal);
    return fakeResponse('Tu peux faire une séance courte.');
  };
  const res = resMock(); await coach.coachHandler(reqMock({ message: 'Fatigué après le stage' }), res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.reply, 'Tu peux faire une séance courte.'); assert.equal(res.body.provider, 'openrouter');
});
test('photo reaches vision provider and result requires manual confirmation', async () => {
  coach.limiter.reset();
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body); assert.equal(body.messages[1].content[1].image_url.url, png);
    assert.equal(body.response_format.type, 'json_object');
    assert.equal(body.messages[1].content[0].text.includes('Pas de JSON'), false);
    return fakeResponse(JSON.stringify({ reply: 'Valeurs lues pour 100 g.', nutrition: { calories: 400, protein: 80, carbs: 6, fat: 4, basis: 'per100g', confidence: 'high', notes: 'Confirme le tableau.' } }));
  };
  const res = resMock(); await coach.coachHandler(reqMock({ message: 'Ma whey', mode: 'label', portionGrams: 30, imageDataUrl: png }), res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.nutrition.protein, 24); assert.equal(res.body.requiresConfirmation, true);
});
test('current chat context avoids invented legacy rest day and preserves history', async () => {
  coach.limiter.reset();
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    const content = body.messages[1].content;
    assert(content.includes('QUESTION ACTUELLE\nRecalcule pour 200 g'));
    assert(content.includes('MMA mardi et jeudi'));
    assert(content.includes('recentMessages'));
    assert(content.includes('lastNutritionAnalysis'));
    assert(!content.includes('Aucune charge à recommander'));
    assert(!content.includes('FORMAT\nCommence par'));
    return fakeResponse('Pour 200 g, cela donne une estimation à confirmer.');
  };
  const res = resMock(); await coach.coachHandler(reqMock({
    message: 'Recalcule pour 200 g', context: {
      schedule: 'MMA mardi et jeudi', today: { sleepMin: 450 },
      recentMessages: [{ role: 'user', text: 'Combien de protéines ?' }],
      lastNutritionAnalysis: { protein: 80, basis: 'per100g' }
    }
  }), res);
  assert.equal(res.statusCode, 200);
});
test('photo question, image and follow-up context all reach the provider', async () => {
  coach.limiter.reset();
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    const [textPart, imagePart] = body.messages[1].content;
    assert(textPart.text.includes('Peux-tu lire cette nouvelle boîte ?'));
    assert(textPart.text.includes('portion précédente 30g'));
    assert(textPart.text.includes('Quantité consommée : 40 g'));
    assert(!textPart.text.includes('Aucune charge à recommander'));
    assert.equal(imagePart.image_url.url, png);
    return fakeResponse(JSON.stringify({ reply: 'Nouvelle boîte lue.', nutrition: { protein: 70, basis: 'per100g' } }));
  };
  const res = resMock(); await coach.coachHandler(reqMock({
    message: 'Peux-tu lire cette nouvelle boîte ?', mode: 'label', portionGrams: 40,
    imageDataUrl: png, context: { recentMessages: [{ role: 'user', text: 'portion précédente 30g' }] }
  }), res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.nutrition.protein, 28);
});
test('vision fallback never uses a text-only model', () => {
  process.env.OPENROUTER_MODEL = 'text-only/custom'; process.env.OPENROUTER_VISION_MODEL = '';
  assert.deepEqual(coach.modelChain(true), [coach.DEFAULT_MODEL]); assert.equal(coach.modelChain()[0], 'text-only/custom');
});
test('provider auth failure is generic and does not leak its details', async () => {
  coach.limiter.reset(); let calls = 0;
  global.fetch = async () => { calls++; return fakeResponse('', 401); };
  const res = resMock(); await coach.coachHandler(reqMock({ message: 'test' }), res);
  assert.equal(res.statusCode, 503); assert.equal(calls, 1); assert(!JSON.stringify(res.body).includes('secret'));
});
test('upstream timeout/failure returns explicit unavailability', async () => {
  coach.limiter.reset();
  global.fetch = async () => { const e = new Error('Timeout'); e.name = 'TimeoutError'; throw e; };
  const res = resMock(); await coach.coachHandler(reqMock({ message: 'test' }), res);
  assert.equal(res.statusCode, 503); assert.equal(res.body.error, 'COACH_UNAVAILABLE');
});
test('rate limit runs before provider and 405 exposes Allow', async () => {
  coach.limiter.reset();
  global.fetch = async () => fakeResponse('D’accord.');
  let res;
  for (let i = 0; i < 7; i++) { res = resMock(); await coach.coachHandler(reqMock({ message: 'test' }), res); }
  assert.equal(res.statusCode, 429); assert(res.headers['Retry-After']);
  const get = resMock(); await coach.coachHandler({ method: 'GET' }, get); assert.equal(get.statusCode, 405); assert.equal(get.headers.Allow, 'POST');
});
test('real local HTTP boundary handles API, bad JSON and missing key', async () => {
  global.fetch = originalFetch; process.env.OPENROUTER_API_KEY = ''; coach.limiter.reset();
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await originalFetch(base + '/api/health'); assert.equal(health.status, 200); assert.equal((await health.json()).coach.status, 'MISSING_KEY');
    const bad = await originalFetch(base + '/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }); assert.equal(bad.status, 400);
    const noKey = await originalFetch(base + '/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Bonjour' }) }); assert.equal(noKey.status, 503);
    const forbidden = await originalFetch(base + '/api/health', { headers: { Origin: 'https://other-site.example' } }); assert.equal(forbidden.status, 403);
    const sensitive = await originalFetch(base + '/.env.local'); assert.equal(sensitive.status, 404);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) { try { await fn(); console.log('✓ ' + name); } catch (error) { failed++; console.error('✗ ' + name + '\n' + error.stack); } }
  global.fetch = originalFetch;
  for (const [key, value] of [['OPENROUTER_API_KEY', originalKey], ['OPENROUTER_MODEL', originalModel], ['OPENROUTER_VISION_MODEL', originalVisionModel]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  console.log(`Backend: ${tests.length - failed}/${tests.length} passed. Provider calls were mocked; no live AI request performed.`);
  process.exitCode = failed ? 1 : 0;
})();
