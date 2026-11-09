import { NotificationsScreen } from '@/components/notifications-list';
import { useAdmin } from '@/context/admin';

export default function AvisosAdmin() {
  const adm = useAdmin();
  return <NotificationsScreen onChanged={adm.reload} />;
}
