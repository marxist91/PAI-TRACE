import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ANOMALY_RULES } from './anomaly-rules';
import { DEFAULT_DESTINATION_COUNTRIES } from './destination-countries';
const threshold = z.object({ warningAfterHours: z.number().int().min(1).max(8760), criticalAfterHours: z.number().int().min(2).max(17520) }).strict()
  .refine(v => v.criticalAfterHours > v.warningAfterHours, 'Le seuil critique doit dépasser le seuil d’alerte.');
export const rulesSchema = z.object({ ATTENDU_PIA: threshold, VU_A_QUAI: threshold, SORTI_TERMINAL: threshold, ENTRE_PIA: threshold }).strict();
export async function readSettings() {
  const stored = await prisma.operationalSettings.findUnique({ where: { id: 1 } });
  const defaults = Object.fromEntries(Object.entries(ANOMALY_RULES).map(([key, value]) => [key, { warningAfterHours: value.warningAfterHours, criticalAfterHours: value.criticalAfterHours }]));
  return { rules: rulesSchema.parse(stored?.rules ?? defaults), destinationCountries: stored?.destinationCountries ?? DEFAULT_DESTINATION_COUNTRIES, disabledDestinationCountries: stored?.disabledDestinationCountries ?? [], version: stored?.version ?? 0, updatedAt: stored?.updatedAt ?? null };
}
