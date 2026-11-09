import { NotificationsScreen } from '@/components/notifications-list';
import { useFamily } from '@/context/family';

export default function Avisos() {
  const fam = useFamily();
  return <NotificationsScreen back onChanged={fam.reload} />;
}
