export const PERMISSIONS = {
    ADMIN: [
        'users.manage', 'roles.manage', 'products.manage',
        'categories.manage', 'brands.manage', 'orders.manage',
        'reviews.moderate', 'filters.manage', 'stats.view',
        'settings.manage'
    ],
    
    MANAGER: [
        'products.create', 'products.update', 'products.delete',
        'reviews.moderate', 'filters.manage', 'orders.view',
        'stats.view', 'categories.view', 'brands.view'
    ],
    
    USER: [
        'products.view', 'orders.create', 'reviews.create',
        'profile.view', 'basket.manage', 'favorites.manage'
    ]
};

export const hasPermission = (user, permission) => {
    if (!user || !user.role) return false;
    
    const userPermissions = PERMISSIONS[user.role.toUpperCase()] || PERMISSIONS.USER;
    return userPermissions.includes(permission);
};

export const isAdmin = (user) => user?.role === 'admin';
export const isManager = (user) => user?.role === 'manager';
export const isManagerOrAdmin = (user) => isAdmin(user) || isManager(user);

export const WithPermission = ({ user, permission, children, fallback = null }) => {
    return hasPermission(user, permission) ? children : fallback;
};

export const getPermissionsForRole = (role) => {
    return PERMISSIONS[role?.toUpperCase()] || PERMISSIONS.USER;
};
export const canManageUsers = (user) => hasPermission(user, 'users.manage');
export const canManageProducts = (user) => hasPermission(user, 'products.manage');
export const canModerateReviews = (user) => hasPermission(user, 'reviews.moderate');
export const canManageFilters = (user) => hasPermission(user, 'filters.manage');

export const PermissionGuard = ({ user, permission, children, fallback = null }) => {
    return hasPermission(user, permission) ? children : fallback;
};