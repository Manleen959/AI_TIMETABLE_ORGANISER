import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

function aiDevMiddleware() {
  return {
    name: 'ai-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/ai')) {
          const resAdapter = {
            statusCode: 200,
            status(code) {
              res.statusCode = code;
              return this;
            },
            json(data) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
          };

          if (req.method === 'GET') {
            try {
              const { default: handler } = await import('./api/ai.js');
              await handler(req, resAdapter);
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                req.body = body ? JSON.parse(body) : (req.body || {});
                const { default: handler } = await import('./api/ai.js');
                await handler(req, resAdapter);
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Populate process.env for api/ai.js in Vite dev server
  Object.assign(process.env, env);

  return {
    plugins: [react(), aiDevMiddleware()],
  };
});
