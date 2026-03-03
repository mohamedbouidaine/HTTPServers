import express, { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

const app = express();
const PORT = 8080;

// ✅ JSON middleware (must be before routes that use req.body)
app.use(express.json());

export async function handlerReadiness(
  req: Request,
  res: Response
): Promise<void> {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}

export function middlewareLogResponses(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.on("finish", () => {
    const status = res.statusCode;
    if (status !== 200) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${status}`);
    }
  });
  next();
}

export function middlewareMetricsInc(
  req: Request,
  res: Response,
  next: NextFunction
) {
  config.fileserverHits++;
  next();
}

export function Metricsprint(req: Request, res: Response) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`  <html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html> `);
}

export function MetricsReset(req: Request, res: Response) {
  config.fileserverHits = 0;
  res.send("OK");
}

export function handlerValidateChirp(req: Request, res: Response): void {
  const body = (req.body as any)?.body;

  // Validate structure
  if (typeof body !== "string") {
    res.status(400).json({ error: "Something went wrong" });
    return;
  }

  // Validate length
  if (body.length > 140) {
    res.status(400).json({ error: "Chirp is too long" });
    return;
  }

  // Profanity filter (case-insensitive, no punctuation handling)
  const bannedWords = ["kerfuffle", "sharbert", "fornax"];

  const cleanedBody = body
    .split(" ")
    .map((word) => (bannedWords.includes(word.toLowerCase()) ? "****" : word))
    .join(" ");

  // ✅ MUST return an object with cleanedBody (not an array)
  res.status(200).json({ cleanedBody });
}

// Middlewares + routes
app.use("/app", middlewareMetricsInc);
app.use(middlewareLogResponses);

app.get("/api/healthz", handlerReadiness);

app.use("/app", express.static("./src/app"));

app.get("/admin/metrics", Metricsprint);
app.post("/admin/reset", MetricsReset);

app.post("/api/validate_chirp", handlerValidateChirp);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});