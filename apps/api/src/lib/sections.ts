import type { SectionView, Sphere } from '@cadence/shared';
import { getSection, spheresForSection } from '@cadence/shared';

export function parseSectionQuery(section?: string): SectionView {
  const valid: SectionView[] = ['business', 'personal', 'family', 'all'];
  if (section && valid.includes(section as SectionView)) {
    return section as SectionView;
  }
  return 'business';
}

export function sphereFilter(section: SectionView) {
  const spheres = spheresForSection(section);
  return { sphere: { in: spheres } };
}

export function sectionMeta(section: SectionView) {
  const config = getSection(section);
  return {
    activeSection: section,
    sectionLabel: config.label,
    sectionSubtitle: config.subtitle,
  };
}

export type { Sphere };
