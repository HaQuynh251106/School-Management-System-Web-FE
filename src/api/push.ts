import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { api } from './client';

const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export type PushRegistrationState = 'UNSUPPORTED' | 'NOT_CONFIGURED' | 'DENIED' | 'READY' | 'INACTIVE';

export function pushConfigurationReady() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId
    && firebaseConfig.messagingSenderId && firebaseConfig.appId
    && env.VITE_FIREBASE_VAPID_KEY);
}

export async function pushRegistrationState(): Promise<PushRegistrationState> {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) return 'UNSUPPORTED';
  if (!pushConfigurationReady()) return 'NOT_CONFIGURED';
  if (Notification.permission === 'denied') return 'DENIED';
  return Notification.permission === 'granted' ? 'READY' : 'INACTIVE';
}

export async function registerBrowserPush() {
  if (!pushConfigurationReady()) throw new Error('Firebase Web Push chưa được cấu hình cho môi trường này.');
  if (!(await isSupported()) || !('serviceWorker' in navigator)) {
    throw new Error('Trình duyệt này không hỗ trợ thông báo đẩy.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bạn chưa cho phép trình duyệt gửi thông báo.');

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(getMessaging(app), {
    vapidKey: env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error('Firebase chưa cấp token cho thiết bị này.');
  await api.post('/me/devices', {
    deviceToken: token,
    platform: 'WEB_PUSH',
    deviceName: browserName(),
  });
  sessionStorage.setItem('sse-fcm-token', token);
  return token;
}

export async function listenForForegroundPush(onNotification: () => void) {
  if (!pushConfigurationReady() || !(await isSupported())) return () => undefined;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return onMessage(getMessaging(app), (payload) => {
    onNotification();
    if (Notification.permission === 'granted' && payload.notification?.title) {
      new Notification(payload.notification.title, { body: payload.notification.body });
    }
  });
}

function browserName() {
  if (navigator.userAgent.includes('Edg/')) return 'Microsoft Edge';
  if (navigator.userAgent.includes('Chrome/')) return 'Google Chrome';
  if (navigator.userAgent.includes('Firefox/')) return 'Mozilla Firefox';
  return 'Trình duyệt web';
}
