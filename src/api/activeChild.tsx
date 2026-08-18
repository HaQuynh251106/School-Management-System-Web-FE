import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

/** Lưu "con đang xem" của phụ huynh (D1) để D2/D4 dùng chung. */
interface ActiveChildValue {
  childId: string | null;
  setChildId: (id: string | null) => void;
}

const Ctx = createContext<ActiveChildValue>({ childId: null, setChildId: () => {} });

export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const [childId, setChildId] = useState<string | null>(null);
  return <Ctx.Provider value={{ childId, setChildId }}>{children}</Ctx.Provider>;
}

export const useActiveChild = () => useContext(Ctx);
