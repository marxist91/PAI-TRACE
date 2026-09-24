import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CurrentPiaStockPanel } from '../components/CurrentPiaStockPanel';
import { OpsHeader, OpsPage } from '../components/OperationsUI';

export default function SejoursPage() {
  const [terminal, setTerminal] = useState<'TOUS' | 'LCT' | 'TOGO'>('TOUS');
  return <OpsPage>
    <OpsHeader title="Conteneurs en séjour à la PIA" subtitle="Uniquement les conteneurs présents actuellement, toutes dates d’entrée confondues." actions={<Link className="ops-button" to="/pia">Entrées et sorties PIA</Link>} />
    <label>Terminal d’origine <select className="ops-select" value={terminal} onChange={e => setTerminal(e.target.value as typeof terminal)}><option value="TOUS">Tous les terminaux</option><option value="LCT">LCT</option><option value="TOGO">Togo Terminal</option></select></label>
    <CurrentPiaStockPanel terminal={terminal} />
  </OpsPage>;
}
