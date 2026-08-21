import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCircle,
  Clock,
  ShippingContainer,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { notificationService, type AppNotification } from '../services/api';

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

function relativeDate(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (elapsedMinutes < 1) return 'À l’instant';
  if (elapsedMinutes < 60) return `Il y a ${elapsedMinutes} min`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function notificationTone(type: string) {
  if (type.includes('CRITIQUE')) return 'critical';
  if (type.includes('ANOMALIE')) return 'warning';
  return 'operation';
}

export default function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll({ limit: 30 }),
    enabled: open,
    staleTime: 15_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const readMutation = useMutation({ mutationFn: notificationService.markRead, onSuccess: refresh });
  const readAllMutation = useMutation({ mutationFn: notificationService.markAllRead, onSuccess: refresh });

  const openNotification = (notification: AppNotification) => {
    if (!notification.lu) readMutation.mutate(notification.id);
    if (notification.conteneurId) {
      navigate(`/conteneurs/${notification.conteneurId}`);
      onClose();
    }
  };

  if (!open) return null;

  const notifications = query.data?.data.notifications ?? [];
  const unreadCount = query.data?.data.unreadCount ?? 0;

  return (
    <div className="notification-layer" role="presentation">
      <button className="notification-backdrop" onClick={onClose} aria-label="Fermer les notifications" />
      <aside className="notification-drawer" aria-label="Centre de notifications" aria-modal="true" role="dialog">
        <header className="notification-header">
          <div>
            <span>Centre d’alertes</span>
            <h2>Notifications</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={21} /></button>
        </header>

        <div className="notification-summary">
          <div><Bell size={18} weight="duotone" /><strong>{unreadCount}</strong><span>non lue{unreadCount > 1 ? 's' : ''}</span></div>
          {unreadCount > 0 && (
            <button onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending}>
              <Check size={16} /> Tout marquer comme lu
            </button>
          )}
        </div>

        <div className="notification-list">
          {query.isLoading ? (
            <div className="notification-loading" aria-label="Chargement des notifications">
              <span /><span /><span />
            </div>
          ) : query.isError ? (
            <div className="notification-state notification-state-error">
              <WarningCircle size={30} weight="duotone" />
              <strong>Notifications indisponibles</strong>
              <span>La connexion au service a échoué.</span>
              <button onClick={() => query.refetch()}>Réessayer</button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-state">
              <CheckCircle size={32} weight="duotone" />
              <strong>Aucune notification</strong>
              <span>Les nouvelles opérations apparaîtront ici.</span>
            </div>
          ) : notifications.map((notification) => {
            const tone = notificationTone(notification.type);
            const ItemIcon = tone === 'operation' ? ShippingContainer : WarningCircle;
            return (
              <button
                key={notification.id}
                className={`notification-item ${notification.lu ? '' : 'unread'} tone-${tone}`}
                onClick={() => openNotification(notification)}
              >
                <span className="notification-item-icon"><ItemIcon size={20} weight="duotone" /></span>
                <span className="notification-item-copy">
                  <strong>{tone === 'operation' ? 'Mise à jour du parcours' : tone === 'critical' ? 'Anomalie critique' : 'Anomalie détectée'}</strong>
                  <span>{notification.message}</span>
                  <small><Clock size={13} /> {relativeDate(notification.createdAt)}</small>
                </span>
                {!notification.lu && <i aria-label="Non lue" />}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
