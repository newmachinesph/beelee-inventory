"use client";

import { createContext, useContext } from "react";

interface StoreContextValue {
  storeId: number;
  storeName: string;
}

const StoreContext = createContext<StoreContextValue>({
  storeId: 1,
  storeName: "",
});

export const useStore = () => useContext(StoreContext);

export default function StoreProvider({
  storeId,
  storeName,
  children,
}: {
  storeId: number;
  storeName: string;
  children: React.ReactNode;
}) {
  return (
    <StoreContext.Provider value={{ storeId, storeName }}>
      {children}
    </StoreContext.Provider>
  );
}
