import { SECTIONS } from '@cadence/shared';
import { Briefcase, Home, Users, LayoutGrid } from 'lucide-react';
import { useSection } from '../../context/SectionContext';
import type { SectionView } from '@cadence/shared';
import './section-switcher.scss';

const icons: Record<SectionView, typeof Briefcase> = {
  business: Briefcase,
  personal: Users,
  family: Home,
  all: LayoutGrid,
};
export default function SectionSwitcher() {
  const { section, setSection } = useSection();

  return (
    <div className="section-switcher">
      <span className="section-switcher__label">Your sections</span>
      {SECTIONS.map((s) => {
        const Icon = icons[s.id];
        const active = section === s.id;
        return (
          <button
            key={s.id}
            type="button"
            className={`section-switcher__btn${active ? ' section-switcher__btn--active' : ''}`}
            onClick={() => setSection(s.id)}
            style={active ? { borderColor: s.accent, background: `${s.accent}18` } : undefined}
          >
            <Icon size={16} style={active ? { color: s.accent } : undefined} />
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
