import React from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { useI18n } from '../../hooks/useI18n';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, tone = 'danger', loading, confirmDisabled, children }: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
      <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} disabled={confirmDisabled} data-autofocus>
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </>
      }>
      
      <div className="flex gap-3">
        {tone === 'danger' &&
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangleIcon className="h-4 w-4" />
          </span>
        }
        <div className="flex-1 space-y-3">
          <p className="text-sm leading-relaxed text-ink-2">{description}</p>
          {children}
        </div>
      </div>
    </Dialog>);

}