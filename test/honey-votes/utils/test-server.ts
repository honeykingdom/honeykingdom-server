// https://github.com/leighhalliday/msw-example/blob/master/src/testServer.js
import { setupServer } from 'msw/node';

export { rest } from 'msw';

export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
