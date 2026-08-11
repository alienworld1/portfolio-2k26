export function normalizePathname(pathname: string): string {
  if (pathname === '/') return pathname;
  return `${pathname.replace(/\/+$/, '')}/`;
}

export function isCurrentPath(currentPath: string, href: string): boolean {
  const current = normalizePathname(currentPath);
  const target = normalizePathname(href);

  return target === '/' ? current === target : current.startsWith(target);
}
