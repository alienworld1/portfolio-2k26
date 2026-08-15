export interface FeaturedBuild {
  title: string;
  type: string;
  status: string;
  summary: string;
  href: string;
}

export interface WorkspaceDestination {
  coordinate: string;
  label: string;
  description: string;
  href: string;
}

export const featuredBuild: FeaturedBuild = {
  title: 'piTrace',
  type: 'Security tooling',
  status: 'Featured build',
  summary:
    'A security-focused build connecting a software engineering foundation with practical defensive analysis.',
  href: '/work/',
};

export const currentFocus = [
  'Security monitoring',
  'Digital forensics',
  'Network analysis',
  'Governance, risk, and compliance',
] as const;

export const workspaceDestinations: readonly WorkspaceDestination[] = [
  {
    coordinate: '01',
    label: 'Work',
    description: 'Security tooling and deployed software',
    href: '/work/',
  },
  {
    coordinate: '02',
    label: 'Experience',
    description: 'Field exposure and practical contributions',
    href: '/experience/',
  },
  {
    coordinate: '03',
    label: 'Lab',
    description: 'Defensive analysis in controlled environments',
    href: '/lab/',
  },
  {
    coordinate: '04',
    label: 'Resume',
    description: 'A concise record of experience and education',
    href: '/resume/',
  },
];
