// Route definitions - will be implemented with React Router
export const routes = {
  dashboard: '/',
  documents: '/documents',
  document: (id: string) => `/documents/${id}`,
  graph: '/graph',
  chat: '/chat',
  genui: '/genui',
  versions: (specId: string) => `/specs/${specId}/versions`,
  settings: '/settings',
  login: '/login',
  register: '/register',
} as const;
