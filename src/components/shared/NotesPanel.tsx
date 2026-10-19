import type { LucideIcon } from "lucide-react";
import React, { useState } from "react";
import { MessageSquareTextIcon, PhoneIcon, MailIcon, UsersIcon, StickyNoteIcon } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Select, Textarea } from "../ui/Input";
import { EmptyState } from "../ui/Feedback";
import { useI18n } from "../../hooks/useI18n";
import { useLookups } from "../../hooks/useLookups";
import { usePermissions } from "../../hooks/usePermissions";
import { Note, NoteChannel } from "../../types/common";
import { uid } from "../../utils/random";
import { nowIso } from "../../utils/dates";
const icons: Record<NoteChannel, LucideIcon> = {
  note: StickyNoteIcon,
  call: PhoneIcon,
  email: MailIcon,
  whatsapp: MessageSquareTextIcon,
  meeting: UsersIcon
};
export function NotesPanel({
  notes,
  onAdd,
  saving,
  title





}: {notes: Note[];onAdd: (note: Note) => void;saving?: boolean;title?: string;}) {
  const {
    t,
    tr,
    name,
    dateTime
  } = useI18n();
  const {
    user
  } = usePermissions();
  const lk = useLookups();
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<NoteChannel>('note');
  const [error, setError] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError(true);
      return;
    }
    onAdd({
      id: uid('note'),
      body: body.trim(),
      channel,
      authorId: user?.id ?? '',
      createdAt: nowIso()
    });
    setBody('');
    setError(false);
  };
  const sorted = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <Panel title={title ?? tr('الملاحظات وسجل التواصل', 'Notes & communication')}>
      <form onSubmit={submit} className="space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={tr('أضف ملاحظة أو سجّل تواصلاً مع العميل…', 'Add a note or log a customer interaction…')} aria-invalid={error} />
        {error && <p className="text-xs text-danger">{t('common.required')}</p>}
        <div className="flex items-center justify-between gap-2">
          <Select value={channel} onChange={(e) => setChannel(e.target.value as NoteChannel)} className="w-40" aria-label={tr('القناة', 'Channel')}>
            {(Object.keys(icons) as NoteChannel[]).map((c) => <option key={c} value={c}>
                {t(`channel.${c}`)}
              </option>)}
          </Select>
          <Button type="submit" size="sm" loading={saving}>
            {t('common.add')}
          </Button>
        </div>
      </form>
      <div className="mt-5 border-t border-line pt-4">
        {sorted.length === 0 ? <EmptyState compact title={tr('لا توجد ملاحظات بعد', 'No notes yet')} /> : <ul className="space-y-4">
            {sorted.map((n) => {
          const Icon = icons[n.channel];
          return <li key={n.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-subtle text-muted">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line text-sm leading-relaxed">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {t(`channel.${n.channel}`)} · {name(lk.user.get(n.authorId))} · {dateTime(n.createdAt)}
                    </p>
                  </div>
                </li>;
        })}
          </ul>}
      </div>
    </Panel>;
}