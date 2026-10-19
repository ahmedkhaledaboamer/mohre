import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2Icon,
  ChevronDownIcon,
  CreditCardIcon,
  HandCoinsIcon,
  LanguagesIcon,
  LogOutIcon,
  MenuIcon,
  PlusIcon,
  ReceiptTextIcon,
  SearchIcon,
  UserPlusIcon,
  WalletIcon,
  SettingsIcon } from
'lucide-react';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Select } from '../ui/Input';
import { Avatar } from '../ui/Display';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsMenu } from './NotificationsMenu';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { branchSelected, languageSet, mobileNavSet } from '../../store/slices/uiSlice';
import { loggedOut } from '../../store/slices/authSlice';
import { branches } from '../../data/branches';
import type { BranchId } from '../../types/common';

export function Topbar() {
  const { t, tr, lang, name } = useI18n();
  const { user, can } = usePermissions();
  const dispatch = useAppDispatch();
  const branch = useAppSelector((s) => s.ui.branch);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const logout = () => {
    dispatch(loggedOut());
    qc.clear();
    navigate('/login');
  };

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-5">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => dispatch(mobileNavSet(true))} aria-label="menu">
        <MenuIcon />
      </Button>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-canvas px-3 text-sm text-muted transition-colors hover:border-line-strong sm:max-w-sm">
        
        <SearchIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{t('common.globalSearch')}</span>
        <kbd className="num ms-auto hidden rounded border border-line bg-surface px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>

      <div className="ms-auto flex items-center gap-1.5">
        <Select
          value={branch}
          onChange={(e) => dispatch(branchSelected(e.target.value as BranchId | 'all'))}
          className="hidden w-44 md:block"
          aria-label={t('common.branch')}>
          
          <option value="all">{t('common.allBranches')}</option>
          {branches.map((b) =>
          <option key={b.id} value={b.id}>
              {name(b)}
            </option>
          )}
        </Select>

        {can('cases.edit') &&
        <Button size="sm" className="h-9" onClick={() => navigate('/transactions/new')}>
            <PlusIcon />
            <span className="hidden sm:inline">{t('nav.newTransaction')}</span>
          </Button>
        }
        <Dropdown
          trigger={({ toggle }) =>
          <Button size="sm" variant="outline" onClick={toggle} className="h-9" aria-label={t('common.quickCreate')}>
              <span className="hidden md:inline">{t('common.quickCreate')}</span>
              <ChevronDownIcon />
            </Button>
          }
          items={[
          { label: t('quick.customer'), icon: UserPlusIcon, onSelect: () => navigate('/customers?new=1'), hidden: !can('crm.edit') },
          { label: t('quick.company'), icon: Building2Icon, onSelect: () => navigate('/companies?new=1'), hidden: !can('crm.edit') },
          { label: t('quick.receipt'), icon: WalletIcon, onSelect: () => navigate('/receipts?new=1'), hidden: !can('collections.record') || !can('finance.view') },
          { label: t('quick.payment'), icon: HandCoinsIcon, onSelect: () => navigate('/payments'), hidden: !can('finance.view') },
          { label: t('quick.invoice'), icon: ReceiptTextIcon, onSelect: () => navigate('/invoices/new'), hidden: !can('finance.edit') },
          { label: t('quick.expense'), icon: CreditCardIcon, onSelect: () => navigate('/expenses'), hidden: !can('finance.edit') }]
          } />
        

        <NotificationsMenu />

        <Button variant="ghost" size="sm" className="h-9" onClick={() => dispatch(languageSet(lang === 'ar' ? 'en' : 'ar'))} aria-label="language">
          <LanguagesIcon />
          <span className="hidden sm:inline">{t('common.language')}</span>
        </Button>

        <Dropdown
          width="w-64"
          trigger={({ toggle }) =>
          <button type="button" onClick={toggle} className="flex items-center gap-2 rounded-md p-1 hover:bg-subtle" aria-label="profile">
              <Avatar name={user ? name(user) : '?'} />
              <span className="hidden text-start leading-tight xl:block">
                <span className="block text-xs font-semibold">{user ? name(user) : ''}</span>
                <span className="block text-[11px] text-muted">{user ? t(`role.${user.role}`) : ''}</span>
              </span>
            </button>
          }
          content={(close) =>
          <div>
              <div className="px-3 py-2.5">
                <p className="text-sm font-semibold">{user ? name(user) : ''}</p>
                <p className="num text-xs text-muted">{user?.email}</p>
                <p className="mt-1 text-xs text-muted">{user ? `${t(`role.${user.role}`)} · ${t(`branch.${user.branchId}`)}` : ''}</p>
              </div>
              <div className="border-t border-line p-1">
                {can('settings.manage') &&
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-2 hover:bg-subtle"
                onClick={() => {
                  close();
                  navigate('/settings');
                }}>
                
                    <SettingsIcon className="h-4 w-4" />
                    {t('nav.settings')}
                  </button>
              }
                <button type="button" className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-danger hover:bg-danger-soft" onClick={logout}>
                  <LogOutIcon className="h-4 w-4" />
                  {t('common.logout')}
                </button>
              </div>
              <p className="border-t border-line px-3 py-2 text-[11px] text-muted">{tr('الصلاحيات في الواجهة للتسهيل فقط؛ التحقق الفعلي يتم في الخادم.', 'UI permissions are a convenience; the backend enforces access.')}</p>
            </div>
          } />
        
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>);

}