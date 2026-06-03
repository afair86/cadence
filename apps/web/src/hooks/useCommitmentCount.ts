import { useEffect, useState } from 'react';
import { fetchCommitments } from '../lib/api';
import { useSection } from '../context/SectionContext';

export function useCommitmentCount(): number {
  const { section } = useSection();
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchCommitments(section)
      .then((d) => setCount(d.suggested.length + d.overdueCount))
      .catch(() => setCount(0));
  }, [section]);

  return count;
}
