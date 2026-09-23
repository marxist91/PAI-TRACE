import { prisma } from '../lib/prisma';
import { publishNotifications } from '../realtime';

interface ActiveAnomaly {
  title: string;
  severity: string;
  detectedAt: Date;
  conteneur: { id: number; numeroBL: string };
}

export async function syncAnomalyNotifications(anomalies: ActiveAnomaly[]) {
  if (anomalies.length === 0) return [];

  const logisticians = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'LOGISTICIEN'] }, isActive: true },
    select: { id: true },
  });
  if (logisticians.length === 0) return [];

  const containerIds = anomalies.map((item) => item.conteneur.id);
  const earliestDetection = anomalies.reduce(
    (earliest, item) => item.detectedAt < earliest ? item.detectedAt : earliest,
    anomalies[0].detectedAt,
  );
  const existing = await prisma.notification.findMany({
    where: {
      type: { in: ['ANOMALIE', 'ANOMALIE_CRITIQUE'] },
      conteneurId: { in: containerIds },
      userId: { in: logisticians.map((user) => user.id) },
      createdAt: { gte: earliestDetection },
    },
    select: { userId: true, conteneurId: true, type: true },
  });
  const existingKeys = new Set(existing.map((item) => `${item.userId}:${item.conteneurId}:${item.type}`));

  const data = anomalies.flatMap((anomaly) => logisticians.flatMap((user) => {
    const type = anomaly.severity === 'critical' ? 'ANOMALIE_CRITIQUE' : 'ANOMALIE';
    if (existingKeys.has(`${user.id}:${anomaly.conteneur.id}:${type}`)) return [];
    return [{
      userId: user.id,
      conteneurId: anomaly.conteneur.id,
      message: `${anomaly.conteneur.numeroBL} : ${anomaly.title}`,
      type,
    }];
  }));

  if (data.length === 0) return [];
  const notifications = await prisma.notification.createManyAndReturn({ data });
  publishNotifications(notifications);
  return notifications;
}
