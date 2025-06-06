const jwt = require("jsonwebtoken");

function checkIsAdmin(req, res, next) {
  console.log("req.user =>", req.user);
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(403).json({ message: "Недостатньо прав доступу" });
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    req.user = user;
    next();
  });
}

module.exports = {
  checkIsAdmin,
  authenticateToken,
};
