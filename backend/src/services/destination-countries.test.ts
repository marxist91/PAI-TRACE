import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_DESTINATION_COUNTRIES, activeDestinationCountries, configuredDestination, destinationCountrySchema } from './destination-countries';

test('désactivation : pays conservé au catalogue mais refusé pour les nouvelles sorties ; réactivation', () => {
  const countries = [...DEFAULT_DESTINATION_COUNTRIES, 'Ghana'];
  const disabled = ['Ghana'];
  assert.deepEqual(activeDestinationCountries(countries, disabled), DEFAULT_DESTINATION_COUNTRIES);
  assert.equal(configuredDestination('ghana', activeDestinationCountries(countries, disabled)), undefined);
  assert.equal(configuredDestination('ghana', activeDestinationCountries(countries, [])), 'Ghana');
  assert.deepEqual(countries, [...DEFAULT_DESTINATION_COUNTRIES, 'Ghana']);
  assert.deepEqual(disabled, ['Ghana']);
  assert.deepEqual(activeDestinationCountries(countries, countries), []);
});
import type { AuthRequest } from '../middleware/auth';
import type { Response } from 'express';

test('destinations initiales et normalisation sans inventer de pays', () => {
  assert.deepEqual(DEFAULT_DESTINATION_COUNTRIES, ['Burkina Faso', 'Mali', 'Niger']);
  assert.equal(configuredDestination('  BURKINA   FASO ', DEFAULT_DESTINATION_COUNTRIES), 'Burkina Faso');
  assert.equal(configuredDestination('Ghana', DEFAULT_DESTINATION_COUNTRIES), undefined);
  assert.equal(configuredDestination('ghana', [...DEFAULT_DESTINATION_COUNTRIES, 'Ghana']), 'Ghana');
  assert.equal(configuredDestination(undefined, DEFAULT_DESTINATION_COUNTRIES), undefined);
  assert.equal(destinationCountrySchema.parse('  Côte   d’Ivoire '), 'Côte d’Ivoire');
  assert.equal(configuredDestination("cote d'ivoire", ['Côte d’Ivoire']), 'Côte d’Ivoire');
});

test('Togo, destinations vides ou inconnues et caractères invalides refusés', () => {
  for (const country of ['', ' ', 'TG', 'TGO', 'togo', 'République togolaise', 'République du Togo', 'À confirmer', 'Inconnu', 'Non renseigné', 'Pays123', '=Ghana', '<script>', 'x'.repeat(81)]) {
    assert.equal(destinationCountrySchema.safeParse(country).success, false, country);
    assert.equal(configuredDestination(country, [country]), undefined);
  }
});

test('seul ADMIN peut modifier le référentiel des pays', async () => {
  // Instantiate the middleware without connecting to any database.
  process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:1/test';
  const { requireRole } = await import('../middleware/auth');
  for (const role of ['ADMIN', 'LOGISTICIEN', 'AGENT_PIA', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'CLIENT', 'CONSIGNATAIRE']) {
    let status = 200, allowed = false;
    const response = { status(code: number) { status = code; return this; }, json() { return this; } } as unknown as Response;
    requireRole('ADMIN')({ user: { id: 1, email: 'test@example.invalid', role, consignataireId: null } } as AuthRequest, response, () => { allowed = true; });
    assert.equal(allowed, role === 'ADMIN');
    assert.equal(status, role === 'ADMIN' ? 200 : 403);
  }
});
