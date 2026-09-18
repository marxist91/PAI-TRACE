import { useRef, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, FileXls, Prohibit, UploadSimple, WarningCircle, X } from '@phosphor-icons/react';
import { manifesteService, type ManifestePreview } from '../services/api';
import { OpsHeader, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { useAuth } from '../contexts/AuthContext';
import { importDateUtc } from '../utils/import-date';

export default function ManifestesPage() {
  const input = useRef<HTMLInputElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dateVaq, setDateVaq] = useState('');
  const [preview, setPreview] = useState<ManifestePreview | null>(null);
  const history = useQuery({ queryKey: ['manifestes'], queryFn: manifesteService.getAll });
  const previewUpload = useMutation({
    mutationFn: manifesteService.preview,
    onSuccess: ({ data }) => {
      setPreview(data.preview);
      setMessage('');
    },
    onError: (error) => {
      setPreview(null);
      setMessage(axios.isAxiosError(error) ? error.response?.data?.error || 'Analyse impossible' : 'Analyse impossible');
    },
  });
  const upload = useMutation({
    mutationFn: (file: File) => manifesteService.import(file, preview?.xml ? importDateUtc(dateVaq) : undefined),
    onMutate: () => {
      setMessage('');
      feedback.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    onSuccess: ({ data }) => {
      const bilan = data.manifeste.bilan;
      setMessage(bilan
        ? `${bilan.crees} créés, ${bilan.completes} complétés, ${bilan.inchanges} inchangés. ${bilan.operationsAjoutees} opérations ajoutées, ${data.manifeste.lignesIgnorees} lignes ignorées.`
        : `${data.manifeste.lignesImportees} conteneurs importés, ${data.manifeste.lignesIgnorees} lignes ignorées.`);
      setPreview(null);
      setSelectedFile(null);
      if (input.current) input.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['manifestes'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['conteneurs'] });
    },
    onError: (error) => {
      setMessage(axios.isAxiosError(error)
        ? error.response?.data?.error || (error.code === 'ECONNABORTED'
          ? 'Le serveur tarde à répondre. Vérifiez l’historique des imports avant de réessayer : le traitement peut encore être en cours.'
          : 'Impossible de joindre le serveur. Vérifiez la connexion et l’historique avant de réessayer.')
        : error instanceof Error ? error.message : 'Import impossible');
      feedback.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  });
  const terminal = user?.role === 'CONTROLEUR_LCT' ? 'LCT' : user?.role === 'CONTROLEUR_TOGO' ? 'Togo Terminal' : null;
  const title = terminal ? `Manifestes ${terminal}` : 'Manifestes Excel';
  const subtitle = terminal
    ? `Importez les conteneurs traités par ${terminal}. Votre terminal est appliqué automatiquement à chaque ligne.`
    : 'Chargez la liste consolidée des conteneurs attendus par la PIA.';
  const chooseFile = (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    setDateVaq('');
    setPreview(null);
    setMessage('');
    previewUpload.mutate(file);
  };
  const cancelPreview = () => {
    setSelectedFile(null);
    setPreview(null);
    setMessage('');
    if (input.current) input.current.value = '';
  };
  const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

  return <OpsPage>
    <OpsHeader title={title} subtitle={subtitle} actions={<button className="ops-button ops-button-primary" onClick={() => input.current?.click()} disabled={upload.isPending || previewUpload.isPending}><UploadSimple size={17} />{previewUpload.isPending ? 'Analyse en cours...' : 'Choisir un fichier Excel / XML'}</button>} />
    <input ref={input} hidden type="file" accept=".xlsx,.xml" onChange={(event) => chooseFile(event.target.files?.[0])} />
    <div ref={feedback} aria-live="polite">
      {upload.isPending && <div className="ops-inline-alert" role="status">Import en cours… Le lot peut prendre quelques instants. Ne relancez pas l’import.</div>}
      {message && <div role={upload.isError || previewUpload.isError ? 'alert' : 'status'} className={upload.isError || previewUpload.isError ? 'ops-inline-alert ops-inline-alert-danger' : 'ops-inline-alert'}>{message}</div>}
    </div>

    {preview && selectedFile && <OpsPanel
      title={`${preview.xml ? 'Manifeste XML PAL' : preview.officiel ? 'Liste officielle PIA' : preview.lectureSeule ? 'Suivi des transferts' : 'Aperçu avant import'} : ${preview.nomFichier}`}
      subtitle={preview.xml ? 'Règle : pia=Y, quel que soit transit. Pays final du registre PIA prioritaire ; Togo confirmé exclu ; pays inconnu conservé à confirmer.' : preview.officiel ? 'Modèle officiel PIA/Port. B/L facultatif. Les champs manquants seront complétés sans effacer les opérations existantes. Un conflit de date bloque tout le lot.' : preview.lectureSeule ? 'Lecture du suivi historique PIA/LCT. Le manifeste source reste attendu pour le rapprochement. Aucune opération enregistrée.' : "Aucune donnée n'a encore été enregistrée. Contrôlez les lignes puis confirmez l'import."}
      action={<div className="ops-inline-actions"><button type="button" className="ops-button" onClick={cancelPreview} disabled={upload.isPending}><X size={15} />Fermer</button>{(!preview.lectureSeule || preview.officiel) && <button type="button" className="ops-button ops-button-primary" onClick={() => upload.mutate(selectedFile)} disabled={upload.isPending || preview.lignesValides === 0}><UploadSimple size={15} />{upload.isPending ? 'Import en cours...' : `Importer ${preview.lignesValides} lignes`}</button>}</div>}
    >
      {preview.xml && <div className="ops-import-guide" style={{ flexWrap: 'wrap' }}>
        <p role="status">{preview.message} {preview.blTotal} B/L analysés. {Object.entries(preview.combinations ?? {}).map(([key, count]) => key + ' : ' + count).join(' · ')}</p>
        {preview.lignesValides > 0 && <label>Date réelle Vu à quai (Lomé / UTC) <input className="ops-select" type="text" placeholder="JJ/MM/AAAA HH:mm" autoComplete="off" spellCheck={false} value={dateVaq} disabled={upload.isPending} onChange={e => setDateVaq(e.target.value)} /><small>Saisissez la date réelle au format JJ/MM/AAAA HH:mm (exemple : 16/09/2026 12:30). Aucune date n’est remplie automatiquement.</small></label>}
        {!preview.lignesValides && <button className="ops-button" onClick={() => input.current?.click()}>Choisir un autre manifeste</button>}
      </div>}
      <div className="manifest-preview-summary" aria-label="Résumé de l'analyse du manifeste">
        <div><span>Lignes analysées</span><strong>{preview.lignesTotal}</strong></div>
        <div className="is-success"><span>{preview.lectureSeule ? 'Lignes retenues' : 'Nouvelles'}</span><strong>{preview.lectureSeule ? preview.lignesValides : preview.creations}</strong></div>
        <div><span>{preview.lectureSeule ? 'Destination à confirmer' : 'Mises à jour'}</span><strong>{preview.lectureSeule ? preview.destinationsAConfirmer : preview.misesAJour}</strong></div>
        <div className={preview.lignesIgnorees ? 'is-danger' : 'is-success'}><span>Ignorées</span><strong>{preview.lignesIgnorees}</strong></div>
      </div>
      {preview.lectureSeule && !preview.xml && <div className="manifest-columns-note"><WarningCircle size={18} /><span>{preview.exclusionsTogo} lignes à destination du Togo exclues. « NON » et les destinations vides restent à confirmer. Les indicateurs prévision, déclaration et dépotage sont repris tels quels ; ils ne remplacent pas une date. {preview.feuilles?.filter((s) => s.lignes > 0).map((s) => `${s.nom.trim()} : ${s.lignes} lignes`).join(' · ')}.</span></div>}
      {preview.colonnesManquantes.length > 0 && <div className="manifest-columns-note"><WarningCircle size={18} /><span>Colonnes facultatives absentes : {preview.colonnesManquantes.join(', ')}.</span></div>}
      <div className="ops-table-wrap"><table className="ops-table manifest-preview-table">
        <thead><tr><th>Ligne / feuille</th><th>Conteneur / B/L</th><th>ATP / navire</th><th>Terminal</th><th>Dates du parcours</th><th>Destination</th><th>Résultat</th></tr></thead>
        <tbody>{preview.lignes.map((row) => <tr key={`${row.sheet || ''}-${row.line}`} className={row.action === 'IGNOREE' ? 'manifest-row-ignored' : ''}>
          <td className="ops-mono">{row.line}<small>{row.sheet}</small></td>
          <td><strong className="ops-mono">{row.numeroConteneur || 'Sans numéro'}</strong><small>{row.numeroBL || 'B/L manquant'}</small></td>
          <td>{row.atp || '-'}<small>{row.navire}</small></td>
          <td>{row.terminal === 'TOGO' ? 'Togo Terminal' : row.terminal || '-'}</td>
          <td>{!preview.lectureSeule && <span>Prévu PIA : {formatDate(row.datePrevuePia)}</span>}<small>VAQ : {formatDate(row.dateDebarquement)}</small>{preview.lectureSeule && <><small>Sortie terminal : {formatDate(row.dateSortieTerminal ?? null)}</small><small>Entrée PIA : {formatDate(row.dateEntreePia ?? null)}</small><small>Sortie PIA : {formatDate(row.dateSortiePia ?? null)}</small></>}</td>
          <td>{row.paysDestination || 'À confirmer'}{row.sourceDestination === 'REGISTRE_PIA' && <small>Source : registre PIA</small>}{Boolean(row.suggestionsPays?.length) && <small>Mentions dans la description (non confirmées) : {row.suggestionsPays!.join(', ')}</small>}<small>{row.typeMarchandise || 'Marchandise à compléter'}</small></td>
          <td><span className={`manifest-action manifest-action-${row.action.toLowerCase()}`}>{row.action === 'IGNOREE' ? <Prohibit size={14} /> : <CheckCircle size={14} />}{row.action === 'ANALYSE' ? (preview.officiel ? 'À intégrer' : 'Lecture seule') : row.action === 'CREATION' ? 'Nouvelle ligne' : row.action === 'MISE_A_JOUR' ? 'Mise à jour' : 'Ignorée'}</span>{preview.lectureSeule && <><small>Prévision : {row.previsionTransfert || 'Non renseignée'} · Déclaration : {row.declaration || 'Non renseignée'} · Dépoté : {row.depote || 'Non renseigné'}</small><small>État lu : {({ SORTI_PIA: 'Sorti de la PIA', ENTRE_PIA: 'Entré à la PIA', SORTI_TERMINAL: 'Sorti du terminal', VU_A_QUAI: 'Vu à quai', A_CONFIRMER: 'À confirmer' } as Record<string, string>)[row.statut || '']}</small></>}{row.issues.length > 0 && <small className={row.action === 'IGNOREE' ? 'manifest-issue-danger' : ''}>{row.issues.join(' · ')}</small>}</td>
        </tr>)}</tbody>
      </table></div>
      {preview.apercuLimite && <div className="manifest-columns-note"><WarningCircle size={18} /><span>L'analyse porte sur toutes les lignes. Le tableau affiche uniquement les 200 premières pour préserver les performances.</span></div>}
    </OpsPanel>}

    <OpsPanel title="Formats acceptés" subtitle="Liste officielle PIA à intégrer ou manifeste — fichier .xlsx ou .xml de 10 Mo maximum">
      <div className="ops-import-guide">
        <FileXls size={38} weight="duotone" />
        <div><strong>Colonnes principales</strong><p>Numéro de conteneur, B/L, ATP, date prévue PIA, date de débarquement / VAQ, pays de destination et marchandise.{terminal ? ` La colonne terminal est facultative et doit correspondre à ${terminal}.` : ' Le terminal peut être LCT ou Togo Terminal.'}</p></div>
      </div>
    </OpsPanel>

    <OpsPanel title={terminal ? `Historique ${terminal}` : 'Historique des imports'} subtitle={terminal ? 'Seuls les manifestes chargés par les agents de votre terminal sont affichés.' : 'Les imports les plus récents apparaissent en premier.'}>
      {history.isLoading ? <OpsState icon={FileXls} title="Chargement de l’historique" /> : history.isError ? <OpsState icon={WarningCircle} title="Historique indisponible" tone="danger" /> : !(history.data?.data.manifestes.length) ? <OpsState icon={FileXls} title="Aucun manifeste chargé" description="Chargez le premier fichier Excel pour démarrer le suivi." /> :
        <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Fichier</th><th>Date d’import</th><th>Lignes</th><th>Importées</th><th>Ignorées</th><th>Importé par</th></tr></thead><tbody>{history.data.data.manifestes.map((item) => <tr key={item.id}><td><strong>{item.nomFichier}</strong></td><td>{new Date(item.importedAt).toLocaleString('fr-FR')}</td><td>{item.lignesTotal}</td><td>{item.lignesImportees}</td><td>{item.lignesIgnorees}</td><td>{item.importePar ? `${item.importePar.prenom} ${item.importePar.nom}` : 'Non renseigné'}</td></tr>)}</tbody></table></div>}
    </OpsPanel>
  </OpsPage>;
}
