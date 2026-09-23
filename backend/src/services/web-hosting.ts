import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';

export function mountWeb(app: Express, directory: string) {
  const root = path.resolve(directory);
  const index = path.join(root, 'index.html');
  if (!existsSync(index)) throw new Error('Interface web absente : compiler web avant de démarrer le service.');
  app.use(express.static(root, { index: false, dotfiles: 'deny' }));
  // Les routes React sont rechargeables, mais une API ou un asset absent reste une 404.
  app.get('/{*path}', (req, res, next) => {
    if (/^\/(api|socket\.io)(\/|$)/.test(req.path) || /(^|\/)\./.test(req.path) || path.extname(req.path) || !req.accepts('html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
}
