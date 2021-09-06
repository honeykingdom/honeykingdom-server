// https://github.com/leighhalliday/msw-example/blob/master/src/testServer.js
import { rest } from 'msw';
import { setupServer } from 'msw/node';

export { rest } from 'msw';

export const server = setupServer();
// rest.get('*', (req, res, ctx) => {
//   console.error(`Please add request handler for ${req.url.toString()}`);

//   return res(
//     ctx.status(500),
//     ctx.json({ error: 'You must add request handler.' }),
//   );
// }),

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
