export type Sphere = 'business' | 'personal' | 'family';

/** Which slice of life you're viewing */
export type SectionView = 'business' | 'personal' | 'family' | 'all';

export interface SectionConfig {
  id: SectionView;
  label: string;
  subtitle: string;
  spheres: Sphere[];
  accent: string;
}

export const SECTIONS: SectionConfig[] = [
  {
    id: 'business',
    label: 'Business',
    subtitle: 'Clients, deals & work relationships',
    spheres: ['business'],
    accent: '#6366f1',
  },
  {
    id: 'personal',
    label: 'Personal',
    subtitle: 'Friends & your wider network',
    spheres: ['personal'],
    accent: '#0ea5e9',
  },
  {
    id: 'family',
    label: 'Family',
    subtitle: 'Partner, kids, parents & relatives',
    spheres: ['family'],
    accent: '#ec4899',
  },
  {
    id: 'all',
    label: 'Everything',
    subtitle: 'All relationships in one view',
    spheres: ['business', 'personal', 'family'],
    accent: '#64748b',
  },
];

export const SPHERE_LABELS: Record<Sphere, string> = {
  business: 'Business',
  personal: 'Personal',
  family: 'Family',
};

export function getSection(id: SectionView): SectionConfig {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}

export function spheresForSection(section: SectionView): Sphere[] {
  return getSection(section).spheres;
}
