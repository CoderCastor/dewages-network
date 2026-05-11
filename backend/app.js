import express from "express";
import cors from "cors";
import connectDB from "./db.js";
import { config } from "./config.js";
import workerRouter from "./router/workerRouter.js";
import adminRouter from "./router/adminRouter.js";
import companyRouter from "./router/companyRouter.js"
import authRouter from "./router/authRouter.js";
import jobRouter from "./router/jobRouter.js";
import healthRouter from "./router/healthRouter.js";
import cronRouter from "./router/cronRouter.js";

const app = express();
const PORT = config.port;

app.use(express.json());

// CORS — allow frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  config.frontendDomain,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, mobile, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use("/v1/worker", workerRouter);
app.use("/v1/admin", adminRouter);
app.use("/v1/company",companyRouter);
app.use("/v1/auth",authRouter);
app.use("/v1/job",jobRouter);
app.use("/health", healthRouter);
app.use("/cron", cronRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "I'm Alive",
  });
});

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
};

startServer();
