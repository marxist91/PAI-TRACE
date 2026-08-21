import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FloppyDisk, ShippingContainer, WarningCircle } from '@phosphor-icons/react';
import { conteneurService } from '../services/api';
import { OpsHeader, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

export default function ConteneurFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({
    numeroConteneur: '', numeroBL: '', atp: '', paysDestination: '', typeMarchandise: '',
    datePrevuePia: '', dateDebarquement: '', terminalAffecte: 'LCT' as 'LCT' | 'TOGO',
  });
  const conteneurQuery = useQuery({ queryKey: ['conteneur', id], queryFn: () => conteneurService.getById(Number(id)), enabled: isEdit, select: (response) => response.data.conteneur });

  useEffect(() => {
    const item = conteneurQuery.data;
    if (!item) return;
    setForm({
      numeroConteneur: item.numeroConteneur || '', numeroBL: item.numeroBL, atp: item.atp || '',
      paysDestination: item.paysDestination || item.destination, typeMarchandise: item.typeMarchandise,
      datePrevuePia: item.datePrevuePia?.slice(0, 16) || '', dateDebarquement: item.dateDebarquement?.slice(0, 16) || '',
      terminalAffecte: item.terminalAffecte || 'LCT',
    });
  }, [conteneurQuery.data]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form, destination: form.paysDestination,
        dateArrivee: new Date(form.datePrevuePia || form.dateDebarquement || Date.now()).toISOString(),
        datePrevuePia: form.datePrevuePia ? new Date(form.datePrevuePia).toISOString() : undefined,
        dateDebarquement: form.dateDebarquement ? new Date(form.dateDebarquement).toISOString() : undefined,
      };
      return isEdit ? conteneurService.update(Number(id), payload) : conteneurService.create({ ...payload, statut: form.dateDebarquement ? 'VU_A_QUAI' : 'ATTENDU_PIA' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteneurs'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['conteneur', id] });
      navigate('/conteneurs');
    },
  });

  if (isEdit && conteneurQuery.isLoading) return <OpsPage><OpsPanel><OpsState icon={ShippingContainer} title="Chargement du conteneur" /></OpsPanel></OpsPage>;
  if (isEdit && conteneurQuery.isError) return <OpsPage><OpsPanel><OpsState icon={WarningCircle} title="Conteneur indisponible" tone="danger" /></OpsPanel></OpsPage>;
  const errorMessage = (mutation.error as { response?: { data?: { error?: string } } } | null)?.response?.data?.error;

  return <OpsPage>
    <OpsHeader title={isEdit ? 'Modifier le conteneur' : 'Ajouter une unité'} subtitle="Informations du manifeste et affectation du terminal de sortie." actions={<button className="ops-button" onClick={() => navigate('/conteneurs')}><ArrowLeft size={14} /> Retour</button>} />
    <OpsPanel title="Données du manifeste" subtitle="Le conteneur sera ensuite suivi jusqu’à sa sortie de la PIA.">
      <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <div className="ops-form-grid">
          <div className="ops-field"><label htmlFor="numeroConteneur">Numéro de conteneur</label><input id="numeroConteneur" className="ops-input ops-mono" value={form.numeroConteneur} onChange={(e) => setForm({ ...form, numeroConteneur: e.target.value })} required /></div>
          <div className="ops-field"><label htmlFor="numeroBL">Numéro B/L</label><input id="numeroBL" className="ops-input ops-mono" value={form.numeroBL} onChange={(e) => setForm({ ...form, numeroBL: e.target.value })} required /></div>
          <div className="ops-field"><label htmlFor="atp">ATP</label><input id="atp" className="ops-input ops-mono" value={form.atp} onChange={(e) => setForm({ ...form, atp: e.target.value })} /></div>
          <div className="ops-field"><label htmlFor="terminal">Terminal de sortie</label><select id="terminal" className="ops-select" value={form.terminalAffecte} onChange={(e) => setForm({ ...form, terminalAffecte: e.target.value as 'LCT' | 'TOGO' })}><option value="LCT">LCT</option><option value="TOGO">Togo Terminal</option></select></div>
          <div className="ops-field"><label htmlFor="destination">Pays de destination</label><input id="destination" className="ops-input" value={form.paysDestination} onChange={(e) => setForm({ ...form, paysDestination: e.target.value })} required /></div>
          <div className="ops-field"><label htmlFor="marchandise">Marchandise</label><input id="marchandise" className="ops-input" value={form.typeMarchandise} onChange={(e) => setForm({ ...form, typeMarchandise: e.target.value })} required /></div>
          <div className="ops-field"><label htmlFor="prevision">Arrivée prévue à la PIA</label><input id="prevision" type="datetime-local" className="ops-input" value={form.datePrevuePia} onChange={(e) => setForm({ ...form, datePrevuePia: e.target.value })} /></div>
          <div className="ops-field"><label htmlFor="debarquement">Date de débarquement / VAQ</label><input id="debarquement" type="datetime-local" className="ops-input" value={form.dateDebarquement} onChange={(e) => setForm({ ...form, dateDebarquement: e.target.value })} /></div>
          {mutation.isError && <p className="ops-field-error ops-field-wide">{errorMessage || 'L’enregistrement a échoué.'}</p>}
        </div>
        <div className="ops-form-actions"><button type="button" className="ops-button" onClick={() => navigate('/conteneurs')}>Annuler</button><button type="submit" className="ops-button ops-button-primary" disabled={mutation.isPending}><FloppyDisk size={14} />{mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}</button></div>
      </form>
    </OpsPanel>
  </OpsPage>;
}
