import { Link } from 'react-router-dom';
import { CompassIcon } from 'lucide-react';
import { EmptyState } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { useI18n } from '../hooks/useI18n';

export function NotFound() {
  const { tr } = useI18n();
  return (
    <div className="rounded-xl border border-line bg-surface">
      <EmptyState
        icon={CompassIcon}
        title={tr('الصفحة غير موجودة', 'Page not found')}
        description={tr('ربما تم نقل الصفحة أو أن الرابط غير صحيح.', 'The page may have moved or the link is incorrect.')}
        action={
        <Link to="/">
            <Button variant="outline">{tr('العودة إلى لوحة التحكم', 'Back to dashboard')}</Button>
          </Link>
        } />
      
    </div>);

}