from rest_framework.permissions import BasePermission, SAFE_METHODS


class RoleBasedPermission(BasePermission):

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Restrict user management to administrators
        if getattr(view, 'admin_only', False):
            return user.is_superuser or user.role == 'ADMIN'

        # All authenticated staff can view permitted records
        if request.method in SAFE_METHODS:
            return True

        # Check the role allowed to perform this action
        role_permissions = getattr(view, 'role_permissions', {})
        allowed_roles = role_permissions.get(
            view.action,
            ['ADMIN']
        )

        return (
            user.is_superuser
            or user.role in allowed_roles
        )