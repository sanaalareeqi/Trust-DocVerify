import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";  // ✅ أضيفي هذا السطر
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ✅ حماية من XSS والثغرات الأمنية (أضيفي هذا القسم)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:5173", "https://*.alchemy.com", "https://*.etherscan.io"],
    },
  },
  xssFilter: true,      // منع XSS
  noSniff: true,        // منع تنفيذ الملفات الخبيثة
}));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ✅ تحديث إعدادات CORS لتدعم الـ credentials
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;