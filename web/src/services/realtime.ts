import { io } from 'socket.io-client';

export function createRealtimeSocket(accessToken: string) {
  const realtimeUrl = import.meta.env.VITE_REALTIME_URL
    || (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:3000` : '/');

  return io(realtimeUrl, {
    path: '/socket.io',
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 750,
    reconnectionDelayMax: 4_000,
    timeout: 10_000,
  });
}
