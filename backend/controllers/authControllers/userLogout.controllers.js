const logout = (req,res) => {
    res.clearCookie("token", {
    httpOnly: true,
    secure: true,   // only over HTTPS
    sameSite: "strict",
  });
  res.status(200).json({ message: "Logged out successfully" });
}

module.exports = logout;