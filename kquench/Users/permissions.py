from rest_framework.permissions import BasePermission
class RoleBasedPermission(BasePermission):

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if getattr(view, 'admin_only', False):
            return user.role == 'ADMIN'

        role_permissions = getattr(view, 'role_permissions', {})

        allowed_roles = role_permissions.get(
            view.action,
            ['ADMIN']
        )

        return user.role in allowed_roles