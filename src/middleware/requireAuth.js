
import { UnauthorizedError } from "../utils/AppError.js";

const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next(new UnauthorizedError("Authentication required"));
  }

  next();
};

export default requireAuth;
