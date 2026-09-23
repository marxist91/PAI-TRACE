import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { readSettings, rulesSchema } from '../services/operational-settings';
import { activeDestinationCountries, configuredDestination, destinationCountrySchema } from '../services/destination-countries';
const router = Router();
router.use(authenticate);
// Operational users can read only this reference list, not administrative settings.
router.get('/destination-countries', async (_req, res) => {
  try { const settings = await readSettings(); res.json({ countries: activeDestinationCountries(settings.destinationCountries, settings.disabledDestinationCountries) }); }
  catch { res.status(500).json({ error: 'Impossible de charger les pays de destination.' }); }
});
router.use(requireRole('ADMIN'));
router.patch('/destination-countries', async (req: AuthRequest, res) => {
  try {
    const data = z.object({ country: destinationCountrySchema, active: z.boolean(), version: z.number().int().min(0) }).strict().parse(req.body);
    const current = await readSettings();
    if (current.version !== data.version) { res.status(409).json({ error: 'Les paramètres ont changé. Actualisez avant de réessayer.' }); return; }
    const country = configuredDestination(data.country, current.destinationCountries);
    if (!country) { res.status(404).json({ error: 'Pays non configuré.' }); return; }
    const disabled = current.disabledDestinationCountries.filter(name => name !== country);
    if (!data.active) disabled.push(country);
    if (data.version === 0) {
      await prisma.operationalSettings.create({ data: { id: 1, rules: current.rules, disabledDestinationCountries: disabled, updatedBy: req.user!.id } });
    } else {
      const saved = await prisma.operationalSettings.updateMany({ where: { id: 1, version: data.version }, data: { disabledDestinationCountries: disabled, version: { increment: 1 }, updatedBy: req.user!.id } });
      if (!saved.count) { res.status(409).json({ error: 'Les paramètres ont changé. Actualisez avant de réessayer.' }); return; }
    }
    res.json(await readSettings());
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message }); return; }
    if ((error as { code?: string })?.code === 'P2002') { res.status(409).json({ error: 'Les paramètres ont changé. Actualisez avant de réessayer.' }); return; }
    res.status(500).json({ error: 'Impossible de modifier l’état du pays.' });
  }
});
router.post('/destination-countries', async (req: AuthRequest, res) => {
  try {
    const { country, version } = z.object({ country: destinationCountrySchema, version: z.number().int().min(0) }).strict().parse(req.body);
    const current = await readSettings();
    if (current.version !== version) { res.status(409).json({ error: 'Les paramètres ont changé. Actualisez avant de réessayer.' }); return; }
    if (configuredDestination(country, current.destinationCountries)) { res.status(409).json({ error: 'Ce pays est déjà dans la liste.' }); return; }
    const countries = [...current.destinationCountries, country];
    if (version === 0) {
      await prisma.operationalSettings.create({ data: { id: 1, rules: current.rules, destinationCountries: countries, updatedBy: req.user!.id } });
    } else {
      const saved = await prisma.operationalSettings.updateMany({ where: { id: 1, version }, data: { destinationCountries: countries, version: { increment: 1 }, updatedBy: req.user!.id } });
      if (!saved.count) { res.status(409).json({ error: 'Les paramètres ont changé. Actualisez avant de réessayer.' }); return; }
    }
    res.status(201).json(await readSettings());
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message }); return; }
    if ((error as { code?: string })?.code === 'P2002') { res.status(409).json({ error: 'Les paramètres ont changé. Actualisez avant de réessayer.' }); return; }
    res.status(500).json({ error: 'Impossible d’ajouter le pays.' });
  }
});
router.get('/', async (_req, res) => {
  try { res.json(await readSettings()); }
  catch { res.status(500).json({ error: 'Impossible de charger les paramètres.' }); }
});
router.put('/', async (req: AuthRequest, res) => {
  try {
    const data = z.object({ rules: rulesSchema, version: z.number().int().min(0) }).strict().parse(req.body);
    const saved = await prisma.$transaction(async tx => {
      if (data.version === 0) return tx.operationalSettings.create({ data: { id: 1, rules: data.rules, updatedBy: req.user!.id } });
      const updated = await tx.operationalSettings.updateMany({ where: { id: 1, version: data.version }, data: { rules: data.rules, version: { increment: 1 }, updatedBy: req.user!.id } });
      return updated.count ? tx.operationalSettings.findUnique({ where: { id: 1 } }) : null;
    });
    if (!saved) { res.status(409).json({ error: 'Les paramètres ont changé. Rechargez la page avant de réessayer.' }); return; }
    res.json({ rules: saved.rules, destinationCountries: saved.destinationCountries, disabledDestinationCountries: saved.disabledDestinationCountries, version: saved.version, updatedAt: saved.updatedAt });
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message }); return; }
    if ((error as { code?: string })?.code === 'P2002') { res.status(409).json({ error: 'Les paramètres ont changé. Rechargez la page.' }); return; }
    res.status(500).json({ error: 'Impossible d’enregistrer les paramètres.' });
  }
});
export default router;
