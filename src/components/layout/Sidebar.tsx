import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelRightCloseIcon, PanelRightOpenIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, XIcon } from 'lucide-react';
import { navigation } from '../../data/navigation';
import { LogoMark } from '../brand/Logo';

const ALL_PATHS = navigation.flatMap((g) => g.items.map((i) => i.to));
/** Exact matching when a more specific nav item exists (e.g. /transactions vs /transactions/new). */
const exactOnly = (to: string) => to === '/' || ALL_PATHS.some((p) => p !== to && p.startsWith(`${to}/`));
import { usePermissions } from '../../hooks/usePermissions';
import { useI18n } from '../../hooks/useI18n';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { mobileNavSet, sidebarToggled } from '../../store/slices/uiSlice';
import { cn } from '../../utils/cn';

function Brand({ collapsed }: {collapsed: boolean;}) {
  const { t } = useI18n();
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      <LogoMark size={34} />
      {!collapsed &&
      <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-white">{t('app.name')}</p>
          <p className="truncate text-[11px] text-white/50">{t('app.tagline')}</p>
        </div>
      }
    </div>);

}

function NavContent({ collapsed, onNavigate }: {collapsed: boolean;onNavigate?: () => void;}) {
  const { can } = usePermissions();
  const { t } = useI18n();
  return (
    <nav className="flex-1 overflow-y-auto px-2.5 pb-4 scroll-thin" aria-label="main">
      {navigation.map((group) => {
        const items = group.items.filter((i) => can(i.permission));
        if (!items.length) return null;
        return (
          <div key={group.key} className="mt-4 first:mt-1">
            {!collapsed && <p className="px-2.5 pb-1.5 text-[11px] font-medium text-white/35">{t(`nav.group.${group.key}`)}</p>}
            <ul className="space-y-0.5">
              {items.map((item) =>
              <li key={item.key}>
                  <NavLink
                  to={item.to}
                  end={exactOnly(item.to)}
                  onClick={onNavigate}
                  title={collapsed ? t(`nav.${item.key}`) : undefined}
                  className={({ isActive }) =>
                  cn(
                    'group flex h-9 items-center gap-3 rounded-md px-2.5 text-[13px] transition-colors duration-150',
                    collapsed && 'justify-center px-0',
                    isActive ? 'bg-navy-3 font-medium text-white' : 'text-white/65 hover:bg-navy-2 hover:text-white'
                  )
                  }>
                  
                    {({ isActive }) =>
                  <>
                        <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[rgb(94,214,205)]' : 'text-white/50 group-hover:text-white/80')} />
                        {!collapsed && <span className="truncate">{t(`nav.${item.key}`)}</span>}
                      </>
                  }
                  </NavLink>
                </li>
              )}
            </ul>
          </div>);

      })}
    </nav>);

}

export function Sidebar() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const mobileOpen = useAppSelector((s) => s.ui.mobileNavOpen);
  const { dir, tr } = useI18n();
  const CollapseIcon = dir === 'rtl' ? collapsed ? PanelRightOpenIcon : PanelRightCloseIcon : collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon;

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-30 hidden flex-col bg-navy transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-[68px]' : 'w-64'
        )}>
        
        <Brand collapsed={collapsed} />
        <NavContent collapsed={collapsed} />
        <button
          type="button"
          onClick={() => dispatch(sidebarToggled())}
          className="flex h-11 items-center gap-2 border-t border-white/10 px-5 text-xs text-white/50 transition-colors hover:text-white"
          aria-label={tr('طي القائمة', 'Collapse sidebar')}>
          
          <CollapseIcon className="h-4 w-4" />
          {!collapsed && tr('طي القائمة', 'Collapse')}
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen &&
        <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-navy/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={() => dispatch(mobileNavSet(false))} />
            <motion.aside
            className="absolute inset-y-0 start-0 flex w-72 flex-col bg-navy"
            initial={{ x: dir === 'rtl' ? 60 : -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir === 'rtl' ? 60 : -60, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
            
              <div className="flex items-center justify-between pe-3">
                <Brand collapsed={false} />
                <button type="button" onClick={() => dispatch(mobileNavSet(false))} className="rounded p-1.5 text-white/60 hover:text-white" aria-label="close">
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              <NavContent collapsed={false} onNavigate={() => dispatch(mobileNavSet(false))} />
            </motion.aside>
          </div>
        }
      </AnimatePresence>
    </>);

}