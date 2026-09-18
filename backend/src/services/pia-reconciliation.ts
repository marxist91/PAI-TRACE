import type { ParsedManifestRow } from './manifest-parser';

export function reconcilePia(expected: ParsedManifestRow[], manifest: ParsedManifestRow[]) {
  const key = (row: ParsedManifestRow) => row.numeroConteneur?.replace(/\s+/g, '').toUpperCase() || null;
  const group = (rows: ParsedManifestRow[]) => {
    const map = new Map<string, ParsedManifestRow[]>();
    for (const row of rows) { const id = key(row); if (id) map.set(id, [...(map.get(id) ?? []), row]); }
    return map;
  };
  const expectedById = group(expected);
  const manifestById = group(manifest);
  const rows = expected.map((row) => {
    const id = key(row);
    const matches = id ? manifestById.get(id) ?? [] : [];
    const issues = [...row.issues];
    let status: 'TROUVE' | 'ABSENT_MANIFESTE' | 'A_VERIFIER' = matches.length ? 'TROUVE' : 'ABSENT_MANIFESTE';
    if (!id) issues.push('Numéro de conteneur requis : aucun rapprochement automatique par B/L');
    if (id && (expectedById.get(id)!.length > 1 || matches.length > 1)) issues.push('Référence multiple : rapprochement ambigu');
    const match = matches.length === 1 ? matches[0] : null;
    if (match && !match.accepted) issues.push(...match.issues);
    if (match && row.terminalAffecte && match.terminalAffecte && row.terminalAffecte !== match.terminalAffecte) issues.push('Terminaux différents entre les deux fichiers');
    if (!id || !row.accepted || (id && expectedById.get(id)!.length > 1) || matches.length > 1 || (match && (!match.accepted || (row.terminalAffecte && match.terminalAffecte && row.terminalAffecte !== match.terminalAffecte)))) status = 'A_VERIFIER';
    return { numeroConteneur: id, lignePia: row.line, ligneManifeste: match?.line ?? null, statut: status, issues,
      terminal: row.terminalAffecte, numeroBL: match?.numeroBL ?? null, atp: match?.atp ?? row.atp,
      dateDebarquement: match?.dateDebarquement?.toISOString() ?? null };
  });
  const horsListe = manifest.filter((row) => !key(row) || !expectedById.has(key(row)!)).map((row) => ({ numeroConteneur: key(row), ligneManifeste: row.line }));
  return { lectureSeule: true, totalListe: expected.length, trouves: rows.filter(r => r.statut === 'TROUVE').length,
    absents: rows.filter(r => r.statut === 'ABSENT_MANIFESTE').length, aVerifier: rows.filter(r => r.statut === 'A_VERIFIER').length,
    horsListeTotal: horsListe.length, lignes: rows.slice(0, 200), horsListe: horsListe.slice(0, 200),
    apercuLimite: rows.length > 200 || horsListe.length > 200 };
}
