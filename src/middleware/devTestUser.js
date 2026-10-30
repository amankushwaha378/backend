export default function devTestUser(req, res, next) {
  req.user = { id: 16 };

  next();
}
