import { useEffect, useState } from 'react';
import { fetchMessages } from '../lib/api';
import { useSection } from '../context/SectionContext';
import { useContactActions } from '../context/ContactActionContext';

export function usePendingMessageCount(): number {
  const { section } = useSection();
  const { contactsVersion } = useContactActions();
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchMessages(section)
      .then((d) => {
        const pending = d.upcoming.filter((m) => m.status === 'pending').length;
        setCount(pending + d.unreadCount);
      })
      .catch(() => setCount(0));
  }, [section, contactsVersion]);

  return count;
}
