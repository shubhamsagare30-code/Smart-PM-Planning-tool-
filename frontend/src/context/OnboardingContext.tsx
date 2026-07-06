import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface OnboardingContextType {
  startTour: () => void;
  isActive: boolean;
}

const OnboardingContext = createContext<OnboardingContextType>({ startTour: () => {}, isActive: false });

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const startTour = useCallback(() => {
    localStorage.removeItem('spp-tour-completed');
    setIsActive(true);
  }, []);
  return (
    <OnboardingContext.Provider value={{ startTour, isActive }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
