export const navItems = [
  { id: 'dashboard', title: 'Dashboard', url: '/dashboard', roles: ['admin', 'superadmin', 'user'] },
  { id: 'products', title: 'Productos', url: '/products', roles: ['admin', 'superadmin'] },
  { id: 'import', title: 'Importar productos', url: '/products/import', roles: ['admin', 'superadmin'] },
  { id: 'pos', title: 'Ventas (TPV)', url: '/sales' },
  { id: 'my-sales', title: 'Mis ventas', url: '/mis-ventas', roles: ['user'] },
  { id: 'sales-history', title: 'Histórico de ventas', url: '/sales-history', roles: ['admin', 'superadmin'] },
  { id: 'users', title: 'Usuarios', url: '/users', roles: ['admin', 'superadmin'] },
];

export function getNavForRole(roleName) {
  const r = roleName ?? 'user';
  return navItems.filter((item) => !item.roles || item.roles.includes(r));
}
