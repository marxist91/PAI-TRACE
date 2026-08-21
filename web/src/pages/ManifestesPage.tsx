import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, FileXls, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { manifesteService } from '../services/api';
import { OpsHeader, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { useAuth } from '../contexts/AuthContext';

export default function ManifestesPage() {
  const input = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const history = useQuery({ queryKey: ['manifestes'], queryFn: manifesteService.getAll });
  const upload = useMutation({
    mutationFn: manifesteService.import,
    onSuccess: ({ data }) => {
      setMessage(`${data.manifeste.lignesImportees} conteneurs importés, ${data.manifeste.lignesIgnorees} lignes ignorées.`);
      queryClient.invalidateQueries({ queryKey: ['manifestes'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
    onError: () => setMessage("L'import a échoué. Vérifiez le format et les noms de colonnes."),
  });
  const terminal = user?.role === 'CONTROLEUR_LCT' ? 'LCT' : user?.role === 'CONTROLEUR_TOGO' ? 'Togo Terminal' : null;
  const title = terminal ? `Manifestes ${terminal}` : 'Manifestes Excel';
  const subtitle = terminal
    ? `Importez les conteneurs traités par ${terminal}. Votre terminal est appliqué automatiquement à chaque ligne.`
    : 'Chargez la liste consolidée des conteneurs attendus par la PIA.';

  return <OpsPage>
    <OpsHeader title={title} subtitle={subtitle} actions={<button className="ops-button ops-button-primary" onClick={() => input.current?.click()} disabled={upload.isPending}><UploadSimple size={17} />{upload.isPending ? 'Import en cours...' : 'Charger un manifeste'}</button>} />
    <input ref={input} hidden type="file" accept=".xlsx" onChange={(event) => event.target.files?.[0] && upload.mutate(event.target.files[0])} />

    <OpsPanel title="Format accepté" subtitle="Une ligne par conteneur, fichier Excel .xlsx de 10 Mo maximum">
      <div className="ops-import-guide">
        <FileXls size={38} weight="duotone" />
        <div><strong>Colonnes principales</strong><p>Numéro de conteneur, B/L, ATP, date prévue PIA, date de débarquement / VAQ, pays de destination et marchandise.{terminal ? ` La colonne terminal est facultative et doit correspondre à ${terminal}.` : ' Le terminal peut être LCT ou Togo Terminal.'}</p></div>
      </div>
      {message && <div className={upload.isError ? 'ops-inline-alert ops-inline-alert-danger' : 'ops-inline-alert'}>{upload.isError ? <WarningCircle size={18} /> : <CheckCircle size={18} />}{message}</div>}
    </OpsPanel>

    <OpsPanel title={terminal ? `Historique ${terminal}` : 'Historique des imports'} subtitle={terminal ? 'Seuls les manifestes chargés par les agents de votre terminal sont affichés.' : 'Les imports les plus récents apparaissent en premier.'}>
      {history.isLoading ? <OpsState icon={FileXls} title="Chargement de l’historique" /> : history.isError ? <OpsState icon={WarningCircle} title="Historique indisponible" tone="danger" /> : !(history.data?.data.manifestes.length) ? <OpsState icon={FileXls} title="Aucun manifeste chargé" description="Chargez le premier fichier Excel pour démarrer le suivi." /> :
        <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Fichier</th><th>Date d’import</th><th>Lignes</th><th>Importées</th><th>Ignorées</th><th>Importé par</th></tr></thead><tbody>{history.data.data.manifestes.map((item) => <tr key={item.id}><td><strong>{item.nomFichier}</strong></td><td>{new Date(item.importedAt).toLocaleString('fr-FR')}</td><td>{item.lignesTotal}</td><td>{item.lignesImportees}</td><td>{item.lignesIgnorees}</td><td>{item.importePar ? `${item.importePar.prenom} ${item.importePar.nom}` : 'Non renseigné'}</td></tr>)}</tbody></table></div>}
    </OpsPanel>
  </OpsPage>;
}
