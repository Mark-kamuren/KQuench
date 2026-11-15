from rest_framework.permissions import BasePermission


class RoleBasedPermission(BasePermission):

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Superusers and administrators have full access.
        if user.is_superuser or user.role == 'ADMIN':
            return True

        # Allow authenticated API metadata requests.
        if request.method == 'OPTIONS':
            return True

        # Each ViewSet must explicitly define allowed roles.
        role_permissions = getattr(view, 'role_permissions', {})
        action = getattr(view, 'action', None)

        allowed_roles = role_permissions.get(action, [])

        return user.role in allowed_roles
