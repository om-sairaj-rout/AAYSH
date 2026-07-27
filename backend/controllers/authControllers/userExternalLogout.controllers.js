const externalLogout = (req,res) => {
    return res.status(200).json({
        message: "Logged out successfully"
    });
}

module.exports = externalLogout;