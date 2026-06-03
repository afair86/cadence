import { useEffect, useState } from 'react';
import { fetchDashboard } from '../lib/api';
import { useSection } from '../context/SectionContext';
import { useContactActions } from '../context/ContactActionContext';

export function useSmartTaskCount(): number {
  const { section } = useSection();
  const { contactsVersion } = useContactActions();
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchDashboard(section)
      .then((d) => setCount(d.smartPlan.length))
      .catch(() => setCount(0));
  }, [section, contactsVersion]);

  return count;
}
