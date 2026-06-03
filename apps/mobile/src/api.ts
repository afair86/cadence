import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use your machine's LAN IP when testing on a physical phone, e.g. http://192.168.1.10:3001
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';
const TOKEN_KEY = 'cadence_token';

let memoryToken: string | null = null;

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') return memoryToken;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function setStoredToken(token: string | null) {
  memoryToken = token;
  if (Platform.OS === 'web') return;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getToken() {
  return getStoredToken();
}

export async function setToken(token: string | null) {
  return setStoredToken(token);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  dashboard: () => request('/api/dashboard'),
  contacts: () => request('/api/contacts'),
  activities: () => request('/api/activities'),
  logActivity: (body: { contactId: string; type: string; notes?: string }) =>
    request('/api/activities', { method: 'POST', body: JSON.stringify(body) }),
  approveAutomation: (id: string) =>
    request(`/api/messages/${id}/approve`, { method: 'POST' }),
};
