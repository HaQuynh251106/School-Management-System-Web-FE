import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/** Lưu "con đang xem" của phụ huynh (D1) để D2/D4 dùng chung. */
interface ActiveChildValue {
  childId: string | null;
  setChildId: (id: string | null) => void;
}

const Ctx = createContext<ActiveChildValue>({ childId: null, setChildId: () => {} });

export function ActiveChildProvider({ children, scopeKey }: { children: ReactNode; scopeKey: string }) {
  const storageKey = `sse.activeChildId:${scopeKey}`;
  const [childId, setChildId] = useState<string | null>(() => sessionStorage.getItem(storageKey));
  useEffect(() => {
    if (childId) sessionStorage.setItem(storageKey, childId);
    else sessionStorage.removeItem(storageKey);
  }, [childId, storageKey]);
  return <Ctx.Provider value={{ childId, setChildId }}>{children}</Ctx.Provider>;
}

export const useActiveChild = () => useContext(Ctx);
