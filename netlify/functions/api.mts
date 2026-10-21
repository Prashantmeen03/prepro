import type { Config } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { createApi } from '../../server/api.js';
import { createStore } from '../../server/store.js';

export default async (req: Request) => {
  const handler = createApi({ getUser, getStore: createStore });
  return handler(req);
};

export const config: Config = { path: '/api/*' };
