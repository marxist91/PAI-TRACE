import { SaxesParser } from 'saxes';
import { terminalForRole } from './manifest-parser';
import type { previewTransfers } from './transfer-preview';

type Node = { name: string; attrs: Record<string, string>; children: Node[]; text: string };
type Transfer = NonNullable<Awaited<ReturnType<typeof previewTransfers>>>;
export function parseXmlManifest(buffer: Buffer, role: string, dateVaq?: string) {
  if (buffer.length > 10 * 1024 * 1024) throw new Error('Fichier limité à 10 Mo');
  const declaration = buffer.subarray(0, 200).toString('ascii');
  const encoding = declaration.match(/encoding\s*=\s*["']([^"']+)/i)?.[1].toLowerCase() ?? 'utf-8';
  if (!['utf-8', 'utf8', 'iso-8859-1'].includes(encoding)) throw new Error('Encodage XML non pris en charge (UTF-8 ou ISO-8859-1 attendu)');
  const xml = encoding === 'iso-8859-1' ? buffer.toString('latin1') : new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  const stack: Node[] = [];
  let root: Node | undefined;
  const parser = new SaxesParser({ xmlns: false });
  parser.on('doctype', () => { throw new Error('DOCTYPE et entités externes interdits'); });
  parser.on('error', () => { throw new Error('XML malformé : aucune donnée importée'); });
  parser.on('opentag', tag => {
    if (stack.length > 40) throw new Error('XML trop profondément imbriqué');
    const node: Node = { name: tag.name, attrs: tag.attributes as Record<string, string>, children: [], text: '' };
    if (stack.length) stack[stack.length - 1].children.push(node); else root = node;
    stack.push(node);
  });
  const text = (value: string) => { if (stack.length) stack[stack.length - 1].text += value; };
  parser.on('text', text); parser.on('cdata', text); parser.on('closetag', () => { stack.pop(); });
  parser.write(xml).close();
  if (!root || root.name !== 'Interchanges') throw new Error('Format de manifeste PAL non reconnu');
  const children = (node: Node, name: string) => node.children.filter(child => child.name === name);
  const child = (node: Node, name: string) => children(node, name)[0];
  let vaq: string | null = null;
  if (dateVaq) {
    const date = new Date(dateVaq);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(dateVaq) || !Number.isFinite(date.getTime()) || date.getTime() > Date.now()) throw new Error('Date réelle Vu à quai invalide ou future');
    vaq = date.toISOString();
  }
  const rows: Transfer['lignes'] = [];
  let blTotal = 0;
  const seen = new Set<string>();
  const combinations: Record<string, number> = {};
  for (const set of children(root, 'MessageSet')) for (const messages of children(set, 'Messages')) for (const notification of children(messages, 'Notification')) {
    if (notification.attrs.type !== 'DAD' || notification.attrs.action !== 'CREATE') throw new Error('Seules les notifications DAD CREATE sont prises en charge');
    for (const list of children(notification, 'liste-apd')) for (const apd of children(list, 'apd')) {
      const voyage = child(apd, 'voyage-mani')?.attrs;
      const navire = child(apd, 'navire-mani')?.attrs.nom ?? '';
      for (const group of children(apd, 'principal-mani-lieu')) for (const bl of children(group, 'principal-mani')) {
        blTotal++;
        const transit = (bl.attrs.transit ?? '').trim().toUpperCase();
        const pia = (bl.attrs.pia ?? '').trim().toUpperCase();
        for (const equip of children(bl, 'equipement-mani')) {
          const key = `${transit || 'ABSENT'}/${pia || 'ABSENT'}`;
          combinations[key] = (combinations[key] ?? 0) + 1;
          const issues: string[] = [];
          const eligible = pia === 'Y';
          if (!eligible) issues.push(`Ignoré : pia=${pia || 'absent'} (pia=Y requis ; transit sans effet)`);
          const number = (equip.attrs.id ?? '').replace(/\s/g, '').toUpperCase();
          const place = (child(equip, 'lieu-mani')?.attrs.manut ?? group.attrs.manut ?? '').trim().toUpperCase();
          // PAL uses LFWTERM for Togo Terminal in the supplied official manifest.
          const terminal = place === 'LCT' ? 'LCT' : ['TOGO', 'TOGO TERMINAL', 'LFWTERM'].includes(place) ? 'TOGO' : null;
          if (eligible) {
            if (!/^[A-Z]{4}\d{7}$/.test(number)) issues.push('Numéro de conteneur invalide');
            if (!bl.attrs.num || !voyage?.atp) issues.push('B/L ou ATP manquant');
            if (!terminal) issues.push(`Code terminal XML non reconnu : ${place || 'absent'}`);
            else if (terminalForRole(role) && terminalForRole(role) !== terminal) issues.push(`Terminal ${terminal === 'TOGO' ? 'Togo Terminal' : terminal} incompatible avec votre poste`);
            if (seen.has(number)) throw new Error(`Conteneur éligible répété : ${number}. Vérification nécessaire.`);
            seen.add(number);
          }
          const description = children(equip, 'lmarchandise-mani').flatMap(m => children(m, 'description').map(d => d.text.trim())).filter(Boolean).join(' / ');
          rows.push({ sheet: 'XML PAL', line: rows.length + 1, numeroConteneur: number, numeroBL: bl.attrs.num ?? null,
            atp: voyage?.atp ?? null, navire, terminal, dateReference: vaq, datePrevuePia: null,
            dateDebarquement: vaq, dateSortieTerminal: null, dateEntreePia: null, dateSortiePia: null,
            paysDestination: null, typeMarchandise: description || null, statut: 'VU_A_QUAI', previsionTransfert: null, declaration: null, depote: null,
            action: eligible && issues.length === 0 ? 'ANALYSE' : 'IGNOREE', issues });
        }
      }
    }
  }
  if (!blTotal) throw new Error('Aucune balise principal-mani reconnue dans ce manifeste');
  const valid = rows.filter(row => row.action === 'ANALYSE').length;
  return { typeDocument: 'SUIVI_TRANSFERT' as const, lectureSeule: true, xml: true, officiel: true,
    lignesTotal: rows.length, lignesValides: valid, lignesIgnorees: rows.length - valid,
    exclusionsTogo: 0, destinationsAConfirmer: valid, creations: 0, misesAJour: 0,
    colonnesReconnues: [], colonnesManquantes: [], feuilles: [], lignes: rows, apercuLimite: false,
    blTotal, combinations, message: valid ? `${valid} conteneurs candidats : pia=Y, destination à vérifier.` : 'Aucun conteneur éligible PIA dans ce manifeste. Aucune donnée enregistrée.' };
}
