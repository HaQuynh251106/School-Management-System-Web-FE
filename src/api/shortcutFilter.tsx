import { createContext, useContext, useMemo, type ReactNode } from 'react';

type ShortcutFilterValue = {
  pageId: string;
  filter: string;
};

const ShortcutFilterContext = createContext<ShortcutFilterValue>({ pageId: '', filter: '' });

export function ShortcutFilterProvider({ value, children }: {
  value: ShortcutFilterValue;
  children: ReactNode;
}) {
  return <ShortcutFilterContext.Provider value={value}>{children}</ShortcutFilterContext.Provider>;
}

export function useShortcutFilter(pageId: string) {
  const current = useContext(ShortcutFilterContext);
  return useMemo(
    () => new URLSearchParams(current.pageId === pageId ? current.filter : ''),
    [current.filter, current.pageId, pageId],
  );
}
