import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import express, { type ErrorRequestHandler } from 'express';
import multer from 'multer';
import request from 'supertest';

test('ExcelJS reste compatible avec uuid corrigé : règles étendues et relecture XLSX', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Compatibilité');
  sheet.addRow([12]);
  // Les icônes étendues exercent le require(uuid).v4 utilisé par ExcelJS.
  sheet.addConditionalFormatting({ ref: 'A1', rules: [{
    type: 'iconSet', priority: 1, iconSet: '3Stars',
    cfvo: [{ type: 'percent', value: 0 }, { type: 'percent', value: 33 }, { type: 'percent', value: 67 }],
  }] });
  const buffer = await workbook.xlsx.writeBuffer();
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(buffer);
  assert.equal(restored.getWorksheet('Compatibilité')?.getCell('A1').value, 12);
});

test('Multer corrigé : upload mémoire accepté et dépassement de taille refusé', async () => {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 32, files: 1 } });
  app.post('/upload', upload.single('file'), (req, res) => res.json({ size: req.file?.size }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => res.status(400).json({ code: error.code });
  app.use(errors);
  await request(app).post('/upload').attach('file', Buffer.from('<manifest/>'), 'test.xml').expect(200, { size: 11 });
  await request(app).post('/upload').attach('file', Buffer.alloc(64), 'test.xml').expect(400, { code: 'LIMIT_FILE_SIZE' });
});
