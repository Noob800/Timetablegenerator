import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createProxyMiddleware } from 'http-proxy-middleware';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Proxy all /api requests to FastAPI backend running on port 8000
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    onProxyReq: (proxyReq: any, req: Request) => {
      console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:8000${req.url}`);
    },
    onProxyRes: (proxyRes: any, req: Request, res: Response) => {
      console.log(`[Proxy Response] ${proxyRes.statusCode} from ${req.url}`);
    }
  }));

  // Health check endpoint for Express server
  app.get('/health/express', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'Express Server' });
  });

  return httpServer;
}
