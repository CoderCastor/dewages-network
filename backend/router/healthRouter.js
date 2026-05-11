import express from "express";
const healthRouter = express.Router();

healthRouter.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "dewages-network-api",
  });
});

export default healthRouter;
