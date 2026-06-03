import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { SectionView } from '@cadence/shared';
import { getSection } from '@cadence/shared';

const STORAGE_KEY = 'cadence_section';

interface SectionContextValue {
  section: SectionView;
  setSection: (section: SectionView) => void;
  sectionLabel: string;
  sectionSubtitle: string;
  accent: string;
}

const SectionContext = createContext<SectionContextValue | null>(null);

function loadSection(): SectionView {
  const saved = localStorage.getItem(STORAGE_KEY);
  const valid: SectionView[] = ['business', 'personal', 'family', 'all'];
  if (saved === 'life') return 'all';
  if (saved && valid.includes(saved as SectionView)) return saved as SectionView;
  return 'business';
}

export function SectionProvider({ children }: { children: ReactNode }) {
  const [section, setSectionState] = useState<SectionView>(loadSection);
  const config = getSection(section);

  const setSection = useCallback((next: SectionView) => {
    setSectionState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <SectionContext.Provider
      value={{
        section,
        setSection,
        sectionLabel: config.label,
        sectionSubtitle: config.subtitle,
        accent: config.accent,
      }}
    >
      {children}
    </SectionContext.Provider>
  );
}

export function useSection() {
  const ctx = useContext(SectionContext);
  if (!ctx) throw new Error('useSection must be used within SectionProvider');
  return ctx;
}

export function sectionQuery(section: SectionView) {
  return `section=${section}`;
}
