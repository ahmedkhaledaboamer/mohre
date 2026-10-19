import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { FlaskConicalIcon, ShieldOffIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { EmptyState } from '../ui/Feedback';
import { useAppSelector } from '../../store/hooks';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import { catalogHooks, useSettings } from '../../hooks/useApi';
import type { Permission } from '../../data/roles';
import { cn } from '../../utils/cn';

function DemoPricingBanner() {
  const { t } = useI18n();
  const settings = useSettings();
  const catalog = catalogHooks.useList();
  const hasDemo = (catalog.data ?? []).some((c) => c.active && c.isDemoPrice);
  if (!settings.data || settings.data.pricingConfigured && !hasDemo) return null;
  return (
    <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warning/20 bg-warning-soft px-4 py-2 text-xs text-warning sm:px-6">
      <FlaskConicalIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold">{t('common.demoPrice')}</span>
      <span className="text-warning/90">{t('common.demoBanner')}</span>
      <Link to="/pricing" className="ms-auto font-medium underline-offset-2 hover:underline">
        {t('common.demoBannerAction')}
      </Link>
    </div>);

}

export function AppShell() {
  const user = useAppSelector((s) => s.auth.user);
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen w-full bg-canvas">
      <Sidebar />
      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200 ease-out', collapsed ? 'lg:ps-[68px]' : 'lg:ps-64')}>
        <Topbar />
        <DemoPricingBanner />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>);

}

export function RequirePermission({ permission, children }: {permission: Permission;children: React.ReactNode;}) {
  const { can } = usePermissions();
  const { t, tr } = useI18n();
  if (!can(permission))
  return (
    <div className="rounded-xl border border-line bg-surface">
        <EmptyState icon={ShieldOffIcon} title={t('common.permissionDenied')} description={tr('تواصل مع مدير النظام لطلب الصلاحية.', 'Contact your administrator to request access.')} />
      </div>);

  return <>{children}</>;
}