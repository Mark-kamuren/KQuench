
from rest_framework.permissions import BasePermission


class RoleBasedPermission(BasePermission):

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Superusers have unrestricted access.
        if user.is_superuser:
            return True

        # Restrict admin-only views.
        if getattr(view, "admin_only", False):
            return user.role == "ADMIN"

        # Check permissions defined in the ViewSet.
        role_permissions = getattr(view, "role_permissions", {})

        allowed_roles = role_permissions.get(
            view.action,
            ["ADMIN"],
        )

        return user.role in allowed_roles
