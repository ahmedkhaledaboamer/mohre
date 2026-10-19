import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types/system';

export interface AuthState {
  user: User | null;
}

const initialState: AuthState = { user: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loggedIn(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    loggedOut(state) {
      state.user = null;
    },
    profileRefreshed(state, action: PayloadAction<User>) {
      if (state.user && state.user.id === action.payload.id) state.user = action.payload;
    }
  }
});

export const { loggedIn, loggedOut, profileRefreshed } = authSlice.actions;
export const authReducer = authSlice.reducer;