import test from 'node:test';
import assert from 'node:assert/strict';
import { parseXmlManifest } from './xml-manifest';

const fixture = (flags: string, more = '', terminal = 'LCT') => Buffer.from(`<?xml version="1.0"?><Interchanges><MessageSet><Messages><Notification type="DAD" action="CREATE"><liste-apd><apd><voyage-mani atp="ATP00208149" eta="12/09/2026 01:00"/><navire-mani nom="MSC TEST"/><principal-mani-lieu manut="${terminal}"><principal-mani num="BL-TEST" ${flags}><equipement-mani id="MSKU1234567"><lmarchandise-mani><description>Matériel &amp; pièces</description></lmarchandise-mani></equipement-mani>${more}</principal-mani></principal-mani-lieu></apd></liste-apd></Notification></Messages></MessageSet></Interchanges>`);
test('seul pia=Y est requis, transit absent ou N ne bloque pas', () => {
  for (const [flags, expected] of [['transit="Y" pia="Y"', 1], ['transit="N" pia="N"', 0], ['transit="Y" pia="N"', 0], ['transit="N" pia="Y"', 1], ['pia="Y"', 1], ['transit="Y"', 0], ['', 0], ['transit="OUI" pia="OUI"', 0]] as const) {
    assert.equal(parseXmlManifest(fixture(flags), 'CONTROLEUR_LCT').lignesValides, expected);
  }
});
test('un BL peut produire plusieurs conteneurs, le port Lomé ne constitue pas le pays final', () => {
  const p = parseXmlManifest(fixture('transit="Y" pia="Y"', '<equipement-mani id="MSKU1234568"/><lieux-mani fin="TGLFW" fin-lib="LOME/TOGO"/>'), 'CONTROLEUR_LCT');
  assert.equal(p.lignesValides, 2); assert.equal(p.lignes[0].numeroBL, 'BL-TEST');
  assert.equal(p.lignes[0].paysDestination, null); assert.equal(p.lignes[0].dateDebarquement, null);
  assert.equal(p.lignes[0].typeMarchandise, 'Matériel & pièces');
});
test('respecte le terminal, refuse doublons, DTD et XML malformé', () => {
  assert.equal(parseXmlManifest(fixture('transit="Y" pia="Y"'), 'CONTROLEUR_TOGO').lignesValides, 0);
  assert.throws(() => parseXmlManifest(fixture('transit="Y" pia="Y"', '<equipement-mani id="MSKU1234567"/>'), 'LOGISTICIEN'), /répété/);
  assert.throws(() => parseXmlManifest(Buffer.from('<Interchanges>'), 'LOGISTICIEN'), /malformé/);
  assert.throws(() => parseXmlManifest(Buffer.from('<!DOCTYPE Interchanges SYSTEM "file:///etc/passwd"><Interchanges/>'), 'LOGISTICIEN'), /DOCTYPE/);
});
test('code PAL LFWTERM reconnu pour Togo Terminal sans ouvrir le périmètre LCT', () => {
  for (const terminal of ['LFWTERM', ' lfwterm ', 'TOGO', 'TOGO TERMINAL']) {
    const bytes = fixture('transit="N" pia="Y"', '', terminal);
    const parsed = parseXmlManifest(bytes, 'CONTROLEUR_TOGO');
    assert.equal(parsed.lignesValides, 1);
    assert.equal(parsed.lignes[0].terminal, 'TOGO');
    assert.equal(parseXmlManifest(bytes, 'LOGISTICIEN').lignesValides, 1);
    assert.equal(parseXmlManifest(bytes, 'CONTROLEUR_LCT').lignesValides, 0);
  }
  assert.equal(parseXmlManifest(fixture('pia="N"', '', 'LFWTERM'), 'CONTROLEUR_TOGO').lignesValides, 0);
  const unknown = parseXmlManifest(fixture('pia="Y"', '', 'INCONNU'), 'CONTROLEUR_TOGO');
  assert.equal(unknown.lignesValides, 0);
  assert.match(unknown.lignes[0].issues.join(' '), /Code terminal XML non reconnu : INCONNU/);
});
test('date VAQ confirmée uniquement, jamais ETA ; futur refusé', () => {
  const bytes = fixture('transit="Y" pia="Y"');
  assert.equal(parseXmlManifest(bytes, 'CONTROLEUR_LCT', '2020-08-01T12:00:00Z').lignes[0].dateDebarquement, '2020-08-01T12:00:00.000Z');
  assert.throws(() => parseXmlManifest(bytes, 'CONTROLEUR_LCT', '2999-08-01T12:00:00Z'), /future/);
});
test('décodage ISO-8859-1', () => {
  const raw = fixture('transit="Y" pia="Y"').toString().replace('version="1.0"', 'version="1.0" encoding="iso-8859-1"');
  assert.equal(parseXmlManifest(Buffer.from(raw, 'latin1'), 'CONTROLEUR_LCT').lignes[0].typeMarchandise, 'Matériel & pièces');
});
