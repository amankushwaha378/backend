import AppError from "../utils/AppError.js";
import multer from "multer";

const errorHandler = (err, req, res, next) => {

  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    error = new AppError("Invalid JSON in request body", 400);
  }

  if (err.code === "23505") {
    error = new AppError("A record with this value already exists", 409);
  }


  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        error.code === "MISSING_FIELD_NAME"
          ? "An upload field is missing its name. Check your form-data keys."
          : error.message,
      code: error.code,
    });
  }


  if (err.code === "23503") {
    error = new AppError("Referenced resource does not exist", 400);
  }


  if (err.code === "23514") {
    error = new AppError("Data violates a database constraint", 400);
  }

  const statusCode = error.statusCode || 500;

 
  if (statusCode >= 500) {
    req.log?.error({ err }, "Unexpected server error");
  } else {
    req.log?.warn(
      {
        statusCode,
        message: error.message,
        method: req.method,
        path: req.originalUrl,
      },
      "Request failed",
    );
  }

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Internal server error"
        : error.message || "Request failed",
  });
};

export default errorHandler;
