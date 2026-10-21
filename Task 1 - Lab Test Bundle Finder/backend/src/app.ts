import express from "express";
import cors from "cors";
import planRoutes from "./routes/plan.routes";


const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", planRoutes);
export default app;
