export const paginateWorkspaces = <T extends { id: string; name: string }>(items: T[], activeId: string | null, query: string, limit: number) => {
  const normalized = query.trim().toLocaleLowerCase();
  const matches = normalized ? items.filter((item) => item.name.toLocaleLowerCase().includes(normalized)) : items;
  if (normalized) return { matches, visible: matches.slice(0, limit) };
  const active = matches.find((item) => item.id === activeId);
  const visible = active ? [active, ...matches.filter((item) => item.id !== activeId)].slice(0, limit) : matches.slice(0, limit);
  return { matches, visible };
};

export const expiryLabel = (expiresAt: string, now = new Date()) => {
  const milliseconds = new Date(expiresAt).getTime() - now.getTime();
  if (milliseconds <= 24 * 60 * 60 * 1000) return "Deletes today";
  return `${Math.ceil(milliseconds / (24 * 60 * 60 * 1000))} days remaining`;
};
