import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import api from '../services/api';
import { OpsPanel } from './OperationsUI';

type Result = {
  totalListe: number; trouves: number; absents: number; aVerifier: number; horsListeTotal: number; apercuLimite: boolean;
  lignes: { numeroConteneur: string | null; lignePia: number; ligneManifeste: number | null; statut: string; issues: string[] }[];
  horsListe: { numeroConteneur: string | null; ligneManifeste: number }[];
};
export function PiaReconciliation() {
  const [pia, setPia] = useState<File | null>(null);
  const [manifest, setManifest] = useState<File | null>(null);
  const comparison = useMutation({ mutationFn: async () => {
    const form = new FormData();
    form.append('listePia', pia!); form.append('manifeste', manifest!);
    return (await api.post<{ rapprochement: Result }>('/manifestes/rapprochement', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.rapprochement;
  } });
  const data = comparison.data;
  return <OpsPanel title="Liste PIA et manifeste : rapprochement" subtitle="La liste PIA définit le périmètre. Comparaison par numéro de conteneur, sans écriture en base.">
    <div className="ops-import-guide" style={{ flexWrap: 'wrap', gap: 20 }}>
      <label>1. Liste des attendus PIA<input type="file" accept=".xlsx" disabled={comparison.isPending} onChange={e => { setPia(e.target.files?.[0] ?? null); comparison.reset(); }} /></label>
      <label>2. Manifeste source<input type="file" accept=".xlsx" disabled={comparison.isPending} onChange={e => { setManifest(e.target.files?.[0] ?? null); comparison.reset(); }} /></label>
      <button className="ops-button ops-button-primary" disabled={!pia || !manifest || comparison.isPending} onClick={() => comparison.mutate()}>{comparison.isPending ? 'Comparaison…' : 'Comparer les fichiers'}</button>
      <p>Format actuel : première feuille, en-têtes en première ligne, colonne « Conteneur ». Pour le logisticien, ajoutez le terminal LCT ou Togo Terminal. Les fichiers originaux restent inchangés.</p>
    </div>
    {comparison.isError && <p role="alert" className="ops-inline-alert ops-inline-alert-danger">{axios.isAxiosError(comparison.error) ? comparison.error.response?.data?.error || 'Comparaison indisponible' : 'Comparaison impossible'}</p>}
    {data && <>
      <div className="manifest-preview-summary"><div><span>Correspondances</span><strong>{data.trouves}</strong></div><div><span>Attendus absents du manifeste</span><strong>{data.absents}</strong></div><div><span>À vérifier</span><strong>{data.aVerifier}</strong></div><div><span>Hors liste PIA</span><strong>{data.horsListeTotal}</strong></div></div>
      <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Conteneur attendu</th><th>Ligne PIA</th><th>Ligne manifeste</th><th>Résultat</th></tr></thead><tbody>{data.lignes.map(row => <tr key={row.lignePia}><td>{row.numeroConteneur || 'Numéro manquant'}</td><td>{row.lignePia}</td><td>{row.ligneManifeste ?? '—'}</td><td>{{ TROUVE: 'Correspondance trouvée', ABSENT_MANIFESTE: 'Toujours attendu — informations du manifeste manquantes', A_VERIFIER: 'À vérifier — aucune sélection automatique' }[row.statut]}<small>{row.issues.join(' · ')}</small></td></tr>)}</tbody></table></div>
      <details className="ops-import-guide"><summary>Conteneurs hors liste PIA ({data.horsListeTotal}) — non retenus</summary><ul>{data.horsListe.map(row => <li key={row.ligneManifeste}>Ligne {row.ligneManifeste} : {row.numeroConteneur || 'Numéro manquant'}</li>)}</ul></details>
      {data.apercuLimite && <p>Aperçu limité à 200 lignes par liste. Les compteurs portent sur l’ensemble des fichiers.</p>}
      <p className="ops-import-guide">Comparaison uniquement : aucun conteneur créé ou modifié. L’enregistrement de la liste PIA et l’application du rapprochement seront ajoutés à l’étape suivante.</p>
    </>}
  </OpsPanel>;
}
