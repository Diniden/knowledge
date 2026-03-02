import { makeObservable, observable, action } from 'mobx';

export type SidebarPanel = 'documents' | 'graph' | 'chat' | 'settings';

const STORAGE_KEY = 'kg_layout_prefs';

interface LayoutPrefs {
  sidebarOpen: boolean;
  activeSidebarPanel: SidebarPanel;
}

function loadPrefs(): Partial<LayoutPrefs> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<LayoutPrefs>) : {};
  } catch {
    return {};
  }
}

export class UILayoutStore {
  sidebarOpen: boolean;
  activeSidebarPanel: SidebarPanel;
  rightPanelOpen = false;
  isFullscreen = false;

  constructor() {
    const prefs = loadPrefs();
    this.sidebarOpen = prefs.sidebarOpen ?? true;
    this.activeSidebarPanel = prefs.activeSidebarPanel ?? 'documents';

    makeObservable(this, {
      sidebarOpen: observable,
      activeSidebarPanel: observable,
      rightPanelOpen: observable,
      isFullscreen: observable,
      toggleSidebar: action.bound,
      setSidebarPanel: action.bound,
      toggleRightPanel: action.bound,
      setFullscreen: action.bound,
    });
  }

  private persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sidebarOpen: this.sidebarOpen,
          activeSidebarPanel: this.activeSidebarPanel,
        }),
      );
    } catch {
      // localStorage unavailable
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    this.persist();
  }

  setSidebarPanel(panel: SidebarPanel) {
    this.activeSidebarPanel = panel;
    this.sidebarOpen = true;
    this.persist();
  }

  toggleRightPanel() {
    this.rightPanelOpen = !this.rightPanelOpen;
  }

  setFullscreen(fullscreen: boolean) {
    this.isFullscreen = fullscreen;
  }
}
