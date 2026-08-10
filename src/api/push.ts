import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { api } from './client';

const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};
const vapidKey = env.VITE_FIREBASE_VAPID_KEY || '';

export function browserPushConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId
    && firebaseConfig.messagingSenderId && firebaseConfig.appId && vapidKey);
}

export async function registerBrowserPush() {
  if (!browserPushConfigured()) throw new Error('Ứng dụng web chưa được cấu hình Firebase Push');
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) {
    throw new Error('Trình duyệt này không hỗ trợ thông báo đẩy');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bạn chưa cấp quyền hiển thị thông báo');
  const serviceWorkerRegistration = await navigator.serviceWorker.register('/push-service-worker.js');
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration });
  if (!token) throw new Error('Không thể tạo mã nhận thông báo cho thiết bị');
  await api.post('/devices', { deviceToken: token, platform: 'WEB' });
  return token;
}
