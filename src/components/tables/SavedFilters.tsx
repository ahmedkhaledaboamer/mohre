import { useState } from 'react';
import { BookmarkIcon, BookmarkPlusIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Input } from '../ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { filterRemoved, filterSaved } from '../../store/slices/uiSlice';
import { uid } from '../../utils/random';

interface SavedFiltersProps {
  page: string;
  values: Record<string, string>;
  onApply: (values: Record<string, string>) => void;
}

const NO_FILTERS: never[] = [];

/** Saved filter presets persisted per page as a UI preference. */
export function SavedFilters({ page, values, onApply }: SavedFiltersProps) {
  const { t, tr } = useI18n();
  const dispatch = useAppDispatch();
  const saved = useAppSelector((s) => s.ui.savedFilters[page]) ?? NO_FILTERS;
  const [name, setName] = useState('');

  return (
    <Dropdown
      width="w-72"
      trigger={({ toggle }) =>
      <Button variant="outline" size="sm" onClick={toggle}>
          <BookmarkIcon />
          <span className="hidden sm:inline">{t('common.savedFilters')}</span>
          {saved.length > 0 && <span className="num rounded bg-primary-soft px-1 text-[10px] text-primary-strong">{saved.length}</span>}
        </Button>
      }
      content={(close) =>
      <div className="p-2">
          {saved.length === 0 ?
        <p className="px-1 py-2 text-xs text-muted">{tr('لا توجد تصفيات محفوظة بعد.', 'No saved filters yet.')}</p> :

        <ul className="mb-2 space-y-0.5">
              {saved.map((f) =>
          <li key={f.id} className="flex items-center gap-1">
                  <button
              type="button"
              className="flex-1 truncate rounded px-2 py-1.5 text-start text-sm hover:bg-subtle"
              onClick={() => {
                onApply(f.values);
                close();
              }}>
              
                    {f.name}
                  </button>
                  <button type="button" className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger" onClick={() => dispatch(filterRemoved({ page, id: f.id }))} aria-label={t('common.delete')}>
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
          )}
            </ul>
        }
          <form
          className="flex gap-1.5 border-t border-line pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            dispatch(filterSaved({ page, filter: { id: uid('flt'), name: name.trim(), values } }));
            setName('');
            toast.success(tr('تم حفظ التصفية', 'Filter saved'));
          }}>
          
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('اسم التصفية الحالية', 'Name current filter')} className="h-8 text-xs" />
            <Button type="submit" size="icon-sm" variant="subtle" aria-label={t('common.saveFilter')}>
              <BookmarkPlusIcon />
            </Button>
          </form>
        </div>
      } />);


}