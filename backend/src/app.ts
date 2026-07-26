import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

/**
 * Express application configuration.
 * Auth routes/controllers/middlewares will be added by another team member.
 */
const app: Application = express();

// Security & logging middlewares
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health-check / smoke-test route
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "Backend restart fonctionne correctement",
  });
});

export default app;
