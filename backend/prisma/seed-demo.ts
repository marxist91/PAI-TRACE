import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';

const TOTAL = 3284;
const LEGACY_DEMO_NUMBERS = ['BL-2024-001', 'MSCU-4829173', 'MAEU-7182345'];

const consignataires = [
  ['Maersk', 'MSK'],
  ['MSC', 'MSC'],
  ['CMA CGM', 'CMA'],
  ['Hapag-Lloyd', 'HPL'],
  ['Triton', 'TRI'],
  ['Seaco', 'SEA'],
] as const;

const destinations = ['Ouagadougou', 'Bamako', 'Niamey', 'PIA - Adétikopé', 'Lomé'];
const marchandises = ['Produits manufacturés', 'Textile', 'Électronique', 'Marchandises diverses'];
const statuts = [
  'ATTENDU_PIA',
  'VU_A_QUAI',
  'VU_A_QUAI',
  'SORTI_TERMINAL',
  'ENTRE_PIA',
  'ENTRE_PIA',
  'SORTI_PIA',
  'SORTI_PIA',
] as const;

const demoAnomalies = [
  { statut: 'ATTENDU_PIA', ageHours: 30 },
  { statut: 'ATTENDU_PIA', ageHours: 54 },
  { statut: 'VU_A_QUAI', ageHours: 16 },
  { statut: 'VU_A_QUAI', ageHours: 28 },
  { statut: 'SORTI_TERMINAL', ageHours: 8 },
  { statut: 'SORTI_TERMINAL', ageHours: 14 },
  { statut: 'ENTRE_PIA', ageHours: 80 },
  { statut: 'ENTRE_PIA', ageHours: 126 },
  { statut: 'ATTENDU_PIA', ageHours: 36 },
  { statut: 'ATTENDU_PIA', ageHours: 60 },
  { statut: 'VU_A_QUAI', ageHours: 18 },
  { statut: 'VU_A_QUAI', ageHours: 30 },
  { statut: 'SORTI_TERMINAL', ageHours: 9 },
  { statut: 'SORTI_TERMINAL', ageHours: 16 },
  { statut: 'ENTRE_PIA', ageHours: 84 },
  { statut: 'ENTRE_PIA', ageHours: 132 },
  { statut: 'ATTENDU_PIA', ageHours: 52 },
] as const;

const safeAgeByStatus: Record<string, number> = {
  ATTENDU_PIA: 8,
  VU_A_QUAI: 6,
  SORTI_TERMINAL: 2,
  ENTRE_PIA: 24,
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const pool = new pg.Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  console.log(`🌱 Génération de ${TOTAL} conteneurs de démonstration...`);

  const consignataireRows = await Promise.all(consignataires.map(([nom, code]) => prisma.consignataire.upsert({
    where: { nom }, update: { code }, create: { nom, code },
  })));
  const password = await bcrypt.hash('password123', 10);
  const logisticien = await prisma.user.upsert({
    where: { email: 'logisticien@pia.tg' },
    update: { password, nom: 'Opérations', prenom: 'Admin', role: 'ADMIN', consignataireId: null },
    create: { email: 'logisticien@pia.tg', password, nom: 'Opérations', prenom: 'Admin', role: 'ADMIN' },
  });
  const accountDefinitions = [
    { email: 'controleur.lct@pia.tg', nom: 'LCT', prenom: 'Kossi', role: 'CONTROLEUR_LCT' as const, consignataireId: null },
    { email: 'controleur.togo@pia.tg', nom: 'Togo Terminal', prenom: 'Ama', role: 'CONTROLEUR_TOGO' as const, consignataireId: null },
    { email: 'agent.pia@pia.tg', nom: 'PIA', prenom: 'Mensah', role: 'AGENT_PIA' as const, consignataireId: null },
  ];
  await Promise.all(accountDefinitions.map((account) => prisma.user.upsert({
    where: { email: account.email },
    update: { password, nom: account.nom, prenom: account.prenom, role: account.role, consignataireId: account.consignataireId },
    create: { ...account, password },
  })));

  const previousDemo = await prisma.conteneur.findMany({
    where: {
      OR: [
        { isDemo: true },
        { numeroBL: { startsWith: 'DEMO-PIA-' } },
        { numeroBL: { in: LEGACY_DEMO_NUMBERS } },
      ],
    },
    select: { id: true },
  });
  const previousIds = previousDemo.map((item) => item.id);
  if (previousIds.length > 0) {
    await prisma.notification.deleteMany({ where: { conteneurId: { in: previousIds } } });
    await prisma.mouvement.deleteMany({ where: { conteneurId: { in: previousIds } } });
    await prisma.checkpoint.deleteMany({ where: { conteneurId: { in: previousIds } } });
    await prisma.conteneur.deleteMany({ where: { id: { in: previousIds } } });
  }

  const rows = Array.from({ length: TOTAL }, (_, index) => {
    const number = index + 1;
    const forcedAnomaly = index >= 64 ? demoAnomalies[index - 64] : undefined;
    const status = forcedAnomaly?.statut ?? statuts[index % statuts.length];
    const ageHours = forcedAnomaly?.ageHours ?? safeAgeByStatus[status] ?? 12 + (index % 72);
    const prefix = ['MSKU', 'CMAU', 'TCLU', 'SEGU', 'MRKU', 'HLBU'][index % 6];
    const numeroConteneur = `${prefix}${String(1234567 + number).slice(-7)}`;
    const datePrevuePia = new Date();
    datePrevuePia.setHours(7 + (index % 11), (index % 4) * 15, 0, 0);
    datePrevuePia.setDate(datePrevuePia.getDate() + (index % 31) - 15);
    const hasQuay = status !== 'ATTENDU_PIA';
    const hasTerminalExit = ['SORTI_TERMINAL', 'ENTRE_PIA', 'SORTI_PIA'].includes(status);
    const hasPiaEntry = ['ENTRE_PIA', 'SORTI_PIA'].includes(status);
    const hasPiaExit = status === 'SORTI_PIA';
    const rawDateDebarquement = hasQuay ? new Date(datePrevuePia.getTime() - (36 + index % 24) * 3_600_000) : null;
    const rawDateSortieTerminal = hasTerminalExit ? new Date(datePrevuePia.getTime() - (5 + index % 4) * 3_600_000) : null;
    const rawDateEntreePia = hasPiaEntry ? new Date(datePrevuePia.getTime() + (index % 3) * 3_600_000) : null;
    const rawDateSortiePia = hasPiaExit && rawDateEntreePia ? new Date(rawDateEntreePia.getTime() + (24 + index % 120) * 3_600_000) : null;
    const operationalDates = [rawDateDebarquement, rawDateSortieTerminal, rawDateEntreePia, rawDateSortiePia]
      .filter((date): date is Date => Boolean(date));
    const latestOperationalTime = operationalDates.length
      ? Math.max(...operationalDates.map((date) => date.getTime()))
      : Date.now();
    const futureShift = Math.max(0, latestOperationalTime - Date.now());
    const keepInPast = (date: Date | null) => date ? new Date(date.getTime() - futureShift) : null;
    const dateDebarquement = keepInPast(rawDateDebarquement);
    const dateSortieTerminal = keepInPast(rawDateSortieTerminal);
    const dateEntreePia = keepInPast(rawDateEntreePia);
    const dateSortiePia = keepInPast(rawDateSortiePia);
    return {
      numeroConteneur,
      numeroBL: `BL-PAL-${String(202600000 + number)}`,
      atp: `ATP-${String(260000 + number)}`,
      consignataireId: consignataireRows[index % consignataireRows.length].id,
      clientId: logisticien.id,
      destination: destinations[index % destinations.length],
      typeMarchandise: marchandises[index % marchandises.length],
      dateArrivee: new Date(Date.now() - ageHours * 3_600_000 - (index % 20) * 60_000),
      statut: status,
      terminalAffecte: Math.floor(index / consignataireRows.length) % 2 === 0 ? 'LCT' as const : 'TOGO' as const,
      datePrevuePia,
      dateDebarquement,
      vueAQuaiAt: dateDebarquement,
      dateSortieTerminal,
      dateEntreePia,
      dateSortiePia,
      paysDestination: ['Burkina Faso', 'Mali', 'Niger', 'Togo'][index % 4],
      isDemo: true,
      isDemoAnomaly: Boolean(forcedAnomaly),
    };
  });

  for (let offset = 0; offset < rows.length; offset += 500) {
    await prisma.conteneur.createMany({ data: rows.slice(offset, offset + 500) });
    console.log(`  ✅ ${Math.min(offset + 500, rows.length)} / ${rows.length}`);
  }
  console.log(`  ✅ ${demoAnomalies.length} anomalies opérationnelles de démonstration`);

  {
    const activityContainers = await prisma.conteneur.findMany({
      where: { isDemo: true },
      orderBy: { id: 'asc' },
      take: 48,
      select: { id: true, terminalAffecte: true },
    });
    const activities = [
      { type: 'TERMINAL_TOGO' as const, statut: 'SORTIE TERMINAL', conteneurStatut: 'SORTI_TERMINAL' as const, lieu: 'Terminal', action: 'SORTIE_TERMINAL', details: 'Sortie du camion-conteneur enregistrée' },
      { type: 'PIA' as const, statut: 'ENTREE PIA', conteneurStatut: 'ENTRE_PIA' as const, lieu: 'PIA - Port sec', action: 'ENTREE_PIA', details: 'Entrée effective au port sec enregistrée' },
      { type: 'PIA' as const, statut: 'SORTIE PIA', conteneurStatut: 'SORTI_PIA' as const, lieu: 'PIA - Port sec', action: 'SORTIE_PIA', details: 'Sortie vers le pays de destination enregistrée' },
    ];

    const activityQueries = activityContainers.map((conteneur, index) => {
      const activity = activities[index % activities.length];
      const usesTerminal = activity.type === 'TERMINAL_TOGO';
      const terminalType = conteneur.terminalAffecte === 'LCT' ? 'TERMINAL_LCT' as const : 'TERMINAL_TOGO' as const;
      const terminalName = terminalType === 'TERMINAL_LCT' ? 'LCT' : 'Togo Terminal';
      const date = new Date(Date.now() - index * 2 * 60_000);
      return prisma.checkpoint.create({
        data: {
          conteneurId: conteneur.id,
          type: usesTerminal ? terminalType : activity.type,
          statut: activity.statut,
          date,
          lieu: usesTerminal ? terminalName : activity.lieu,
          notes: '[DEMO] Activité générée pour la présentation',
          mouvement: {
            create: {
              conteneurId: conteneur.id,
              userId: logisticien.id,
              action: activity.action,
              date,
              details: usesTerminal ? `${activity.details} à ${terminalName}` : activity.details,
            },
          },
        },
      });
    });
    for (let offset = 0; offset < activityQueries.length; offset += 8) {
      await prisma.$transaction(activityQueries.slice(offset, offset + 8));
    }
    for (const [activityIndex, activity] of activities.entries()) {
      const operationalDate = new Date(Date.now() - activityIndex * 60 * 60_000);
      await prisma.conteneur.updateMany({
        where: {
          id: {
            in: activityContainers
              .filter((_, index) => index % activities.length === activityIndex)
              .map((conteneur) => conteneur.id),
          },
        },
        data: {
          statut: activity.conteneurStatut,
          ...(activity.conteneurStatut === 'SORTI_TERMINAL' ? { dateSortieTerminal: operationalDate } : {}),
          ...(activity.conteneurStatut === 'ENTRE_PIA' ? { dateSortieTerminal: new Date(operationalDate.getTime() - 2 * 3_600_000), dateEntreePia: operationalDate } : {}),
          ...(activity.conteneurStatut === 'SORTI_PIA' ? { dateSortieTerminal: new Date(operationalDate.getTime() - 30 * 3_600_000), dateEntreePia: new Date(operationalDate.getTime() - 24 * 3_600_000), dateSortiePia: operationalDate } : {}),
        },
      });
    }
    console.log(`  ✅ ${activityContainers.length} mouvements de démonstration`);
  }

  await prisma.$disconnect();
  await pool.end();
  console.log('✅ Données de démonstration prêtes. Elles restent identifiables et supprimables en une commande.');
}

main().catch((error) => {
  console.error('❌ Échec du seed démo :', error);
  process.exit(1);
});
