const validateUser = (req, res, next) => {
  const { name, email, age } = req.body;

  const errors = {};

  // Name validation
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  // Email validation
  if (
    !email ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "Valid email is required";
  }

  // Age validation
  if (
    age === undefined ||
    !Number.isInteger(Number(age)) ||
    Number(age) < 1 ||
    Number(age) > 120
  ) {
    errors.age = "Age must be an integer between 1 and 120";
  }

  // If errors exist
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      errors,
    });
  }

  next();
};

export default validateUser;