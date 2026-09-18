import type { OperationPeriod } from '../services/api';

export function OperationPeriodPicker({ periode, date, onPeriodChange, onDateChange }: {
  periode: OperationPeriod;
  date: string;
  onPeriodChange: (value: OperationPeriod) => void;
  onDateChange: (value: string) => void;
}) {
  return <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
    <select className="ops-select" aria-label="Durée de la période" value={periode} onChange={(event) => onPeriodChange(event.target.value as OperationPeriod)}>
      <option value="jour">Journée du</option>
      <option value="semaine">Semaine du lundi au dimanche contenant le</option>
      <option value="mois">Mois contenant le</option>
    </select>
    <input className="ops-select" type="date" aria-label="Date de référence de la période (Lomé)" value={date} onChange={(event) => { if (event.target.value && event.target.validity.valid) onDateChange(event.target.value); }} />
    <button className="ops-button" type="button" onClick={() => onDateChange(new Date().toISOString().slice(0, 10))}>Période actuelle</button>
  </div>;
}
