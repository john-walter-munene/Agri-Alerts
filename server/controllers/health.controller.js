const healthCheck = (req, res) => {
  res.json({
    success: true,
    status: "OK",
    service: "Agri API",
    timestamp: new Date().toISOString(),
  });
};

module.exports = { healthCheck };