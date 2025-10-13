import express from "express";
import cors from "cors";
import connectDB from "./db.js";
import { config } from "./config.js";
import workerRouter from "./router/workerRouter.js";
import adminRouter from "./router/adminRouter.js";

const app = express();
const PORT = config.port;

app.use(express.json());
app.use(cors());

app.use("/v1/worker", workerRouter);
app.use("/v1/admin", adminRouter);
// app.use("v1/company",companyRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "I'm Alive",
  });
});

const startServer = async () => {
  await connectDB();
  app.listen(8000, () => console.log(`Server is running on port ${PORT}`));
};

startServer();
