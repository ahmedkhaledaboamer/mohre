import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BranchId, Lang } from '../../types/common';
import type { PeriodKey } from '../../utils/dates';

export interface SavedFilter {
  id: string;
  name: string;
  values: Record<string, string>;
}

export interface UiState {
  lang: Lang;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  branch: BranchId | 'all';
  savedFilters: Record<string, SavedFilter[]>;
  hiddenColumns: Record<string, string[]>;
  /** Reporting period shared by the dashboard and every report. Custom bounds are yyyy-MM-dd. */
  period: {key: PeriodKey;from?: string;to?: string;};
}

export const initialUiState: UiState = {
  lang: 'ar',
  sidebarCollapsed: false,
  mobileNavOpen: false,
  branch: 'all',
  savedFilters: {},
  hiddenColumns: {},
  period: { key: 'today' }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUiState,
  reducers: {
    languageSet(state, action: PayloadAction<Lang>) {
      state.lang = action.payload;
    },
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    mobileNavSet(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    branchSelected(state, action: PayloadAction<BranchId | 'all'>) {
      state.branch = action.payload;
    },
    filterSaved(state, action: PayloadAction<{page: string;filter: SavedFilter;}>) {
      const list = state.savedFilters[action.payload.page] ?? [];
      state.savedFilters[action.payload.page] = [...list, action.payload.filter];
    },
    filterRemoved(state, action: PayloadAction<{page: string;id: string;}>) {
      state.savedFilters[action.payload.page] = (state.savedFilters[action.payload.page] ?? []).filter((f) => f.id !== action.payload.id);
    },
    columnsSet(state, action: PayloadAction<{table: string;hidden: string[];}>) {
      state.hiddenColumns[action.payload.table] = action.payload.hidden;
    },
    periodSet(state, action: PayloadAction<{key: PeriodKey;from?: string;to?: string;}>) {
      state.period = { ...state.period, ...action.payload };
    }
  }
});

export const { languageSet, sidebarToggled, mobileNavSet, branchSelected, filterSaved, filterRemoved, columnsSet, periodSet } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;