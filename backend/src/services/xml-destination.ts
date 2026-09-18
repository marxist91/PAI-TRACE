import { normalizeManifestValue } from './manifest-parser';
import type { parseXmlManifest } from './xml-manifest';

export function knownCountry(value: string | null | undefined) {
  if (!value || ['', 'NON', 'N A', 'A CONFIRMER', 'A RENSEIGNER', 'NON RENSEIGNE', 'NON RENSEIGNEE', 'INCONNU'].includes(normalizeManifestValue(value))) return null;
  return value.trim();
}
export function isTogoCountry(value: string | null | undefined) {
  return ['TOGO', 'TG', 'TGO', 'REPUBLIQUE TOGOLAISE', 'REPUBLIQUE DU TOGO'].includes(normalizeManifestValue(value || ''));
}
export function suggestedCountries(description: string | null) {
  const text = normalizeManifestValue(description || '');
  // Mentions only: never persisted as a confirmed destination.
  return ['BURKINA FASO', 'MALI', 'NIGER', 'TOGO', 'BENIN', 'GHANA', 'GUINEE', 'SENEGAL', 'COTE D IVOIRE'].filter(country => new RegExp(`\\b${country}\\b`).test(text));
}
export function resolveXmlDestinations(preview: ReturnType<typeof parseXmlManifest>, registry: Array<{ numeroConteneur: string | null; paysDestination: string | null }>) {
  const countries = new Map(registry.map(row => [row.numeroConteneur, knownCountry(row.paysDestination)]));
  let exclusionsTogo = 0;
  const lignes = preview.lignes.map(row => {
    if (row.action !== 'ANALYSE') return row;
    const country = countries.get(row.numeroConteneur) ?? null;
    const suggestionsPays = suggestedCountries(row.typeMarchandise);
    if (isTogoCountry(country)) {
      exclusionsTogo++;
      return { ...row, paysDestination: country, suggestionsPays, sourceDestination: 'REGISTRE_PIA', action: 'IGNOREE' as const, issues: [...row.issues, 'Exclu : destination finale Togo confirmée dans le registre PIA'] };
    }
    return { ...row, paysDestination: country, suggestionsPays, sourceDestination: country ? 'REGISTRE_PIA' : 'A_CONFIRMER',
      issues: [...row.issues, ...(!country ? ['Pays final à confirmer — les mentions de la description ne sont que des suggestions'] : [])] };
  });
  const valid = lignes.filter(row => row.action === 'ANALYSE');
  return { ...preview, lignes, lignesValides: valid.length, lignesIgnorees: lignes.length - valid.length, exclusionsTogo,
    destinationsAConfirmer: valid.filter(row => !row.paysDestination).length,
    message: valid.length ? `${valid.length} conteneurs retenus (pia=Y). ${exclusionsTogo} destination(s) Togo confirmée(s) exclue(s).` : 'Aucun conteneur éligible PIA dans ce manifeste. Aucune donnée enregistrée.' };
}
