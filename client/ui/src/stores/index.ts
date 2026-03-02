import { createContext, useContext, type ReactNode } from 'react';
import { createElement } from 'react';
import { RootStore } from './RootStore';

export { RootStore } from './RootStore';
export * from './domain';
export * from './session';
export * from './ui';

const rootStore = new RootStore();
const StoreContext = createContext<RootStore>(rootStore);

export function StoreProvider({ children }: { children: ReactNode }) {
  return createElement(StoreContext.Provider, { value: rootStore }, children);
}

export function useStore(): RootStore {
  return useContext(StoreContext);
}
