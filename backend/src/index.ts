import express from 'express';

const port = Number(process.env.PORT ?? 8055);
const app = express();

/** Liveness probe — registered before any heavy imports or env validation. */
app.get('/server/live', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

await new Promise<void>((resolve, reject) => {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`CMS backend liveness on http://0.0.0.0:${port}/server/live`);
    resolve();
  });
  server.on('error', reject);
});

try {
  const { bootstrapApp } = await import('./bootstrap-server.js');
  await bootstrapApp(app);
} catch (err: unknown) {
  console.error('Failed to bootstrap CMS backend:', err);
  process.exit(1);
}
