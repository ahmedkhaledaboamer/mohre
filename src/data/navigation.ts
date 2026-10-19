import {
  LayoutDashboardIcon,
  UsersIcon,
  Building2Icon,
  IdCardIcon,
  LandmarkIcon,
  PlusCircleIcon,
  TagsIcon,
  ReceiptTextIcon,
  WalletIcon,
  HandCoinsIcon,
  CreditCardIcon,
  ArrowLeftRightIcon,
  TruckIcon,
  BarChart3Icon,
  FolderOpenIcon,
  ListChecksIcon,
  UserCogIcon,
  SettingsIcon,
  type LucideIcon } from
'lucide-react';
import type { Permission } from './roles';

export interface NavItem {
  key: string;
  to: string;
  icon: LucideIcon;
  permission: Permission;
}

export interface NavGroup {
  key: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
{ key: 'main', items: [{ key: 'dashboard', to: '/', icon: LayoutDashboardIcon, permission: 'dashboard.view' }] },
{
  key: 'work',
  items: [
  { key: 'newTransaction', to: '/transactions/new', icon: PlusCircleIcon, permission: 'cases.edit' },
  { key: 'transactions', to: '/transactions', icon: LandmarkIcon, permission: 'cases.view' }]

},
{
  key: 'crm',
  items: [
  { key: 'customers', to: '/customers', icon: UsersIcon, permission: 'crm.view' },
  { key: 'companies', to: '/companies', icon: Building2Icon, permission: 'crm.view' },
  { key: 'employees', to: '/employees', icon: IdCardIcon, permission: 'crm.view' }]

},
{
  key: 'finance',
  items: [
  { key: 'invoices', to: '/invoices', icon: ReceiptTextIcon, permission: 'finance.view' },
  { key: 'receipts', to: '/receipts', icon: WalletIcon, permission: 'finance.view' },
  { key: 'payments', to: '/payments', icon: HandCoinsIcon, permission: 'finance.view' },
  { key: 'expenses', to: '/expenses', icon: CreditCardIcon, permission: 'finance.view' },
  { key: 'cash', to: '/cash', icon: ArrowLeftRightIcon, permission: 'cash.view' },
  { key: 'suppliers', to: '/suppliers', icon: TruckIcon, permission: 'finance.view' }]

},
{
  key: 'reports',
  items: [{ key: 'reports', to: '/reports', icon: BarChart3Icon, permission: 'reports.view' }]
},
{
  key: 'system',
  items: [
  { key: 'pricing', to: '/pricing', icon: TagsIcon, permission: 'pricing.view' },
  { key: 'documents', to: '/documents', icon: FolderOpenIcon, permission: 'documents.view' },
  { key: 'tasks', to: '/tasks', icon: ListChecksIcon, permission: 'tasks.view' },
  { key: 'users', to: '/users', icon: UserCogIcon, permission: 'users.manage' },
  { key: 'settings', to: '/settings', icon: SettingsIcon, permission: 'settings.manage' }]

}];
