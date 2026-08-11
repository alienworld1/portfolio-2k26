export interface NavigationItem {
  label: string;
  href: string;
}

export const primaryNavigation: readonly NavigationItem[] = [
  { label: 'Overview', href: '/' },
  { label: 'Work', href: '/work/' },
  { label: 'Experience', href: '/experience/' },
  { label: 'Competitions', href: '/competitions/' },
  { label: 'Lab', href: '/lab/' },
  { label: 'Profile', href: '/profile/' },
  { label: 'Resume', href: '/resume/' },
];

export const mobilePrimaryNavigation: readonly NavigationItem[] = [
  { label: 'Overview', href: '/' },
  { label: 'Work', href: '/work/' },
  { label: 'Lab', href: '/lab/' },
  { label: 'Profile', href: '/profile/' },
];

export const mobileSecondaryNavigation = primaryNavigation.filter(
  ({ href }) => !mobilePrimaryNavigation.some((item) => item.href === href),
);
