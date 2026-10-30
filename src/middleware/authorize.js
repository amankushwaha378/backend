
import {
  UnauthorizedError,
  ForbiddenError,
} from "../utils/AppError.js";

const rolePermissions = {
  admin: [
    "post:read",
    "post:create",
    "post:update:any",
    "post:delete:any",
    "comment:read",
    "comment:create",
    "comment:update:any",
    "comment:delete:any",
    "like:create",
    "like:delete",
    "user:read",
    "user:update-role",
    "user:delete",
  ],

  editor: [
    "post:read",
    "post:create",
    "post:update:own",
    "post:delete:own",
    "comment:read",
    "comment:create",
    "comment:update:own",
    "comment:delete:own",
    "like:create",
    "like:delete",
  ],

  viewer: ["post:read", "comment:read"],
};

export function authorize(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    const permissions = rolePermissions[req.user.role];

    if (!permissions) {
      return next(new ForbiddenError("Invalid user role"));
    }

    if (!permissions.includes(permission)) {
      return next(
        new ForbiddenError(
          "You do not have permission to perform this action",
        ),
      );
    }

    next();
  };
}

export function authorizeAny(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    const permissions = rolePermissions[req.user.role] ?? [];

    const allowed = requiredPermissions.some((permission) =>
      permissions.includes(permission),
    );

    if (!allowed) {
      return next(
        new ForbiddenError(
          "You do not have permission to perform this action",
        ),
      );
    }

    next();
  };
}
