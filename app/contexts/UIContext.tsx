import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UIContextType {
  showDbModal: boolean;
  toggleDbModal: () => void;
  setShowDbModal: (show: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [showDbModal, setShowDbModal] = useState(false);

  const toggleDbModal = useCallback(() => {
    setShowDbModal(prev => !prev);
  }, []);

  return (
    <UIContext.Provider value={{ showDbModal, toggleDbModal, setShowDbModal }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}