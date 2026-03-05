import express, { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { NewUser ,NewChirp, NewRefreshToken } from "./db/schema.js";
import { createChirps, createRefreshToken, createUser, deleteAllUser, deletechirps, getChirp, getChirps,getChirpsByAuthorId,getUserByEmail,getUserFromRefreshToken, updateRefreshToken, updateuser, upgradeUserToChirpyRed } from "./db/queries.js";
import { hashPassword,checkPasswordHash, validateJWT, makeJWT, getBearerToken, makeRefreshToken, getAPIKey } from "./auth.js";

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);
const app = express();
const PORT = 8080;


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
  config.api.fileserverHits++;
  next();
}

export function Metricsprint(req: Request, res: Response) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`  <html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
  </body>
</html> `);
}

export function MetricsReset(req: Request, res: Response) {
  config.api.fileserverHits = 0;
  if (config.api.platform !== "dev") {
  throw new ForbiddenError (`configplatform is ${config.api.platform}`)
    return;
  }
  deleteAllUser();
  res.status(200).json({
    message: "All users deleted",
  });}

export async function handlerCreateChirp(req: Request, res: Response): Promise<void> {
  const { body } = req.body as { body?: unknown };

  if (typeof body !== "string") {
    throw new BadRequestError("Something went wrong");
  }

  if (body.length > 140) {
    throw new BadRequestError("Chirp is too long. Max length is 140");
  }

  const token = getBearerToken(req);

  let userId: string;
  try {
    userId = validateJWT(token, config.JWT_SECRET);
  } catch {
    
    throw new UnauthorizedError("Invalid or expired token");
   
  }

  const newChirp: NewChirp = {
    body,
    userId,
  };

  const newChirpData = await createChirps(newChirp);
  res.status(201).json(newChirpData);
}
export async function handlerGETALLChirp(req: Request, res: Response): Promise<void> {
  const authorId = req.query.authorId as string | undefined;
  const sort = (req.query.sort as string | undefined) ?? "asc";

  let chirpsData;

  if (authorId) {
    chirpsData = await getChirpsByAuthorId(authorId);
  } else {
    chirpsData = await getChirps();
  }

  if (sort === "desc") {
    chirpsData.reverse();
  }

  res.status(200).json(chirpsData);
}

export async function handlerGETChirp(req: Request, res: Response,param :string): Promise<void> {
const chirpsData  = await getChirp(param);
if(!chirpsData){
throw new NotFoundError("NotFound");
}
res.status(200).json(chirpsData );
}

export function errorHandler( err: Error,req: Request,res: Response,next: NextFunction) {
  console.log(err.message);
  res.status(500).json({
    error: "Something went wrong on our end",
  });
}

class BadRequestError extends Error {
   statusCode: number;
constructor(message: string) {
    super(message);
    this.statusCode = 400;
  }
}
export class UnauthorizedError extends Error {
   statusCode: number;
constructor(message: string) {
    super(message);
    this.statusCode = 401;
  }
}
export class ForbiddenError extends Error {
   statusCode: number;
constructor(message: string) {
    super(message);
    this.statusCode = 403;
  }
}
class NotFoundError extends Error {
   statusCode: number;
constructor(message: string) {
    super(message);
    this.statusCode = 404;
  }
}

function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
const status = (err as any).statusCode || 500;
res.status(status).json({ error: err.message });
}

type CreateUserBody = {
  email: string;
}
type UserResponse = Omit<NewUser, "hashedPassword">;
export async function createUserController(
  req: Request,
  res: Response
): Promise<void> {
  const { password, email } = req.body as { password: string; email: string };

  if (!email || !password) {
    throw new BadRequestError("email and password are required");
  }

  const hashedPassword = await hashPassword(password);

  const newUser: NewUser = {
    email,
    hashedPassword,
  };

  const createdUser = await createUser(newUser);

  const userResponse: UserResponse = createdUser;
  res.status(201).json(userResponse);
}

export async function loginController(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string  };
  const expirationOfJWTs = 3600;
  const expirationOfRefreshTokens = 60 * 24 * 60 * 60;
  if (!email || !password) {
    throw new UnauthorizedError("incorrect email or password");
  }
   
  try {
    const user = await getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedError("incorrect email or password");
    
    }

    const ok = await checkPasswordHash(password, user.hashedPassword);

    if (!ok) {
      throw new UnauthorizedError("incorrect email or password");
    }

    
    const token =makeJWT(user.id, expirationOfJWTs, config.JWT_SECRET);
    const  refreshToken =makeRefreshToken();
    const { hashedPassword, ...safeUser } = user;

    const RefreshToken: NewRefreshToken = {
     token:refreshToken,
     userId :user.id,
     expiresAt: new Date(Date.now() + expirationOfRefreshTokens * 1000),
     revokedAt:null
  };

   await createRefreshToken(RefreshToken);
    res.status(200).json({
      ...safeUser,
      token,
      refreshToken,
    });
  } catch {
    throw new UnauthorizedError("incorrect email or password");
  }
}

export async function handlerRevokeRefreshToken(req: Request, res: Response): Promise<void> {
  
  const refreshToken = getBearerToken(req);
 await updateRefreshToken(refreshToken);
 res.status(204).end();
 
}
export async function handlerRefreshToken(req: Request, res: Response): Promise<void> {
  const refreshToken = getBearerToken(req);

  const user = await getUserFromRefreshToken(refreshToken);

  if (!user) {
    throw new UnauthorizedError("Invalid or expired token");
  }
  const accessToken = makeJWT(user.userId, 60 * 60, config.JWT_SECRET);

  res.status(200).json({ token: accessToken });
}

export async function handleredituserreq(req:Request, res: Response): Promise<void>{
  const {email,password} =req.body as {email :string,password:string};
  const token = getBearerToken(req);
  const userId = validateJWT(token, config.JWT_SECRET);
  const hashnewpass = await hashPassword(password);
   const updateUser = await updateuser(email,hashnewpass,userId);

   if (!updateUser) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  res.status(200).json(updateUser);
}

export async function handlerDeleteChirp(req: Request,res: Response,chirpId: string): Promise<void> {
  const token = getBearerToken(req);
  const userId = validateJWT(token, config.JWT_SECRET);

  const chirp = await getChirp(chirpId);

  if (!chirp) {
    throw new NotFoundError("NotFound");
  }

  if (chirp.userId !== userId) {
    throw new ForbiddenError("Forbidden");
  }

  await deletechirps(chirp.id);

  res.status(204).end();
}

export async function handlePolkaWebhook(req: Request, res: Response): Promise<void> {
  const apiKey = getAPIKey(req);

  if (apiKey !== config.POLKA_KEY) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const { event, data } = req.body as {
    event: string;
    data: { userId: string };
  };

  if (event !== "user.upgraded") {
    res.status(204).end();
    return;
  }

  const updatedUser = await upgradeUserToChirpyRed(data.userId);

  if (!updatedUser) {
    throw new NotFoundError("NotFound");
  }

  res.status(204).end();
}


app.use("/app", middlewareMetricsInc);
app.use(middlewareLogResponses);

app.get("/api/healthz", handlerReadiness);

app.use("/app", express.static("./src/app"));

app.get("/admin/metrics", Metricsprint);
app.post("/admin/reset", MetricsReset);

// Chirps
app.post("/api/chirps", (req, res, next) => {
  Promise.resolve(handlerCreateChirp(req, res)).catch(next);
});

app.get("/api/chirps", (req, res, next) => {
  Promise.resolve(handlerGETALLChirp(req, res)).catch(next);
});

app.get("/api/chirps/:chirpId", (req, res, next) => {
  Promise.resolve(handlerGETChirp(req, res, req.params.chirpId)).catch(next);
});


app.post("/api/users", (req, res, next) => {
  Promise.resolve(createUserController(req, res)).catch(next);
});

app.post("/api/login", (req, res, next) => {
  Promise.resolve(loginController(req, res)).catch(next);
});


app.post("/api/refresh", (req, res, next) => {
  Promise.resolve(handlerRefreshToken(req, res)).catch(next);
});

// Revoke refresh token
app.post("/api/revoke", (req, res, next) => {
  Promise.resolve(handlerRevokeRefreshToken(req, res)).catch(next);
});

app.put("/api/users", (req, res, next) => {
  Promise.resolve(handleredituserreq(req, res)).catch(next);
});

app.delete("/api/chirps/:chirpId", (req, res, next) => {
  Promise.resolve(handlerDeleteChirp(req, res, req.params.chirpId as string)).catch(next);
});
app.post("/api/polka/webhooks", (req, res, next) => {
  Promise.resolve(handlePolkaWebhook(req, res)).catch(next);
});

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});