import test from 'node:test';
import assert from 'node:assert/strict';
import { parseXmlManifest } from './xml-manifest';
import { resolveXmlDestinations, suggestedCountries } from './xml-destination';
const parsed = () => parseXmlManifest(Buffer.from('<Interchanges><MessageSet><Messages><Notification type="DAD" action="CREATE"><liste-apd><apd><voyage-mani atp="ATP1"/><principal-mani-lieu manut="LCT"><principal-mani num="BL1" transit="N" pia="Y"><equipement-mani id="MSKU1234567"><lmarchandise-mani><description>GOODS IN TRANSIT TO BURKINA FASO VIA TOGO</description></lmarchandise-mani></equipement-mani><lieux-mani fin="TGLFW"/></principal-mani></principal-mani-lieu></apd></liste-apd></Notification></Messages></MessageSet></Interchanges>'), 'CONTROLEUR_LCT');
test('pays absent conservé ; mentions de description non confirmées et port Lomé ignoré', () => {
  const p = resolveXmlDestinations(parsed(), []);
  assert.equal(p.lignesValides, 1); assert.equal(p.destinationsAConfirmer, 1);
  assert.equal(p.lignes[0].paysDestination, null);
  assert.deepEqual(suggestedCountries(p.lignes[0].typeMarchandise), ['BURKINA FASO', 'TOGO']);
});
test('registre prioritaire et pays Togo confirmé exclu avec ses variantes', () => {
  for (const country of ['Togo', 'TG', 'TGO', 'République togolaise']) {
    const p = resolveXmlDestinations(parsed(), [{ numeroConteneur: 'MSKU1234567', paysDestination: country }]);
    assert.equal(p.lignesValides, 0); assert.equal(p.exclusionsTogo, 1);
  }
  const p = resolveXmlDestinations(parsed(), [{ numeroConteneur: 'MSKU1234567', paysDestination: 'Mali' }]);
  assert.equal(p.lignesValides, 1); assert.equal(p.lignes[0].paysDestination, 'Mali'); assert.equal(p.destinationsAConfirmer, 0);
});
test('les valeurs à confirmer ne sont pas des pays confirmés', () => {
  for (const country of ['NON', 'À confirmer', '']) {
    const p = resolveXmlDestinations(parsed(), [{ numeroConteneur: 'MSKU1234567', paysDestination: country }]);
    assert.equal(p.lignesValides, 1); assert.equal(p.destinationsAConfirmer, 1);
  }
  assert.deepEqual(suggestedCountries('NIGERIA'), []);
});
