import { configureStore } from '@reduxjs/toolkit';
import { authReducer, type AuthState } from './slices/authSlice';
import { initialUiState, uiReducer, type UiState } from './slices/uiSlice';
import { setActor } from '../services/session';

const UI_KEY = 'wifaq-ui-prefs';
const AUTH_KEY = 'wifaq-demo-session';

function load<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : undefined;
  } catch {
    return undefined;
  }
}

const savedUi = load<Partial<UiState>>(UI_KEY);
const savedAuth = load<AuthState>(AUTH_KEY);

export const store = configureStore({
  reducer: { auth: authReducer, ui: uiReducer },
  preloadedState: {
    ui: { ...initialUiState, ...savedUi, mobileNavOpen: false },
    auth: savedAuth ?? { user: null }
  }
});

if (savedAuth?.user) setActor(savedAuth.user.id);

let lastUi: UiState | undefined;
let lastAuth: AuthState | undefined;
store.subscribe(() => {
  const { ui, auth } = store.getState();
  if (ui !== lastUi) {
    lastUi = ui;
    const { mobileNavOpen: _ignored, ...persisted } = ui;
    localStorage.setItem(UI_KEY, JSON.stringify(persisted));
  }
  if (auth !== lastAuth) {
    lastAuth = auth;
    // Demo session only — holds a non-sensitive user profile, never credentials.
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    if (auth.user) setActor(auth.user.id);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;