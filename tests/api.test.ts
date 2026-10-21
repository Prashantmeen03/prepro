import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../server/api.js';
import type { Store } from '../server/store.js';
import { HttpError, profileSchema } from '../server/validation.js';

const origin = 'https://prepro.example';
const user = { id: 'user-a', email: 'a@example.test', userMetadata: { username: 'Asha' } };
function request(path: string, method = 'GET', body?: unknown) {
  return new Request(`${origin}${path}`, { method, headers: { origin, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function fixture(overrides: Partial<Store> = {}) {
  return {
    getProfile: async () => profileSchema.parse({}),
    updateProfile: async () => profileSchema.parse({}),
    listReports: async () => [],
    getReport: async () => { throw new HttpError(404, 'Interview report not found.'); },
    addReport: async () => { throw new Error('Unexpected generation'); },
    limitGeneration: async () => {},
    health: async () => {},
    ...overrides,
  } as Store;
}

test('private endpoints reject signed-out requests before accessing storage', async () => {
  const api = createApi({ getUser: async () => null, getStore: () => { throw new Error('Storage must not be accessed'); } });
  for (const path of ['/api/interview/', '/api/resume/profile', '/api/auth/get-me']) {
    assert.equal((await api(request(path))).status, 401);
  }
});

test('health distinguishes a working database from unavailable storage without leaking errors', async () => {
  const online = createApi({ getUser: async () => null, getStore: () => fixture() });
  assert.equal((await online(request('/api/health'))).status, 200);
  const offline = createApi({ getUser: async () => null, getStore: () => fixture({ health: async () => { throw new Error('Private driver details'); } }) });
  const result = await offline(request('/api/health'));
  assert.equal(result.status, 503);
  assert.doesNotMatch(await result.text(), /Private driver/);
});

test('session endpoint preserves the existing frontend user shape', async () => {
  const api = createApi({ getUser: async () => user, getStore: () => fixture() });
  const response = await api(request('/api/auth/get-me'));
  assert.deepEqual((await response.json()).user, { id: user.id, _id: user.id, username: 'Asha', email: user.email });
});

test('profile updates use the authenticated owner and ignore forged ownership and file fields', async () => {
  let saved: unknown;
  const store = fixture({
    getProfile: async (id, name, email) => {
      assert.deepEqual([id, name, email], [user.id, 'Asha', user.email]);
      return { ...profileSchema.parse({}), user: id, updatedAt: new Date().toISOString() };
    },
    updateProfile: async (id, patch) => {
      assert.equal(id, user.id);
      saved = patch;
      return { ...profileSchema.parse(patch), user: id, updatedAt: new Date().toISOString() };
    },
  });
  const api = createApi({ getUser: async () => user, getStore: () => store });
  const response = await api(request('/api/resume/profile', 'PUT', {
    personalInfo: { fullName: 'Asha', professionalHeadline: 'Engineer' },
    userId: 'someone-else', resumeFile: { rawText: 'forged' },
    socialLinks: { github: 'https://github.com/example' },
    skills: { frontendTechnologies: ['React'] },
  }));
  assert.equal(response.status, 200);
  assert.equal(Object.hasOwn(saved as object, 'resumeFile'), false);
  assert.equal(Object.hasOwn(saved as object, 'userId'), false);
  const data = await response.json();
  assert.equal(data.profile.personalInfo.professionalHeadline, 'Engineer');
  assert.deepEqual(data.profile.skills.frontendTechnologies, ['React']);
});

test('history and individual reports pass the authenticated owner to storage', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const api = createApi({ getUser: async () => user, getStore: () => fixture({
    listReports: async owner => { assert.equal(owner, user.id); return []; },
    getReport: async (owner, reportId) => {
      assert.equal(owner, user.id);
      assert.equal(reportId, id);
      throw new HttpError(404, 'Interview report not found.');
    },
  }) });
  assert.equal((await api(request('/api/interview/'))).status, 200);
  assert.equal((await api(request(`/api/interview/report/${id}`))).status, 404);
  assert.equal((await api(request('/api/interview/report/invalid-id'))).status, 400);
});

test('cross-site changes and invalid strategy input are rejected', async () => {
  const api = createApi({ getUser: async () => user, getStore: () => fixture() });
  assert.equal((await api(new Request(`${origin}/api/resume/profile`, { method: 'PUT', headers: { origin: 'https://other.example' }, body: '{}' }))).status, 403);
  assert.equal((await api(request('/api/interview/', 'POST', { jobDescription: 'short' }))).status, 400);
  assert.equal((await api(request('/api/interview/', 'POST', { jobDescription: 'A complete role description' }))).status, 400);
});

test('malformed bodies return actionable errors and storage failures do not disclose details', async () => {
  const api = createApi({ getUser: async () => user, getStore: () => fixture() });
  assert.equal((await api(new Request(`${origin}/api/resume/profile`, { method: 'PUT', headers: { origin, 'Content-Type': 'application/json' }, body: '{' }))).status, 400);
  const failing = createApi({ getUser: async () => user, getStore: () => fixture({ listReports: async () => { throw new Error('Private connection details'); } }) });
  const response = await failing(request('/api/interview/'));
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /Private connection/);
});

test('saved profiles download as a PDF without invoking AI', async () => {
  const api = createApi({ getUser: async () => user, getStore: () => fixture() });
  const response = await api(request('/api/resume/pdf'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
});
