
import { asc, and, eq, gt, isNull} from "drizzle-orm";
import { db } from "./index.js";
import { users ,NewUser, NewChirp, chirps, NewRefreshToken, refreshTokens } from "./schema.js";
export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function createChirps(chirp: NewChirp) {
  const [result] = await db.insert(chirps).values(chirp).returning();
  return result; 
}

export async function deleteAllUser() {
  await db.delete(users);
}

export async function getChirps() {
  const result = await db
    .select()
    .from(chirps)
    .orderBy(asc(chirps.createdAt));

  return result;
}

export async function getChirp(id : string) {
  const result = await db
    .select()
    .from(chirps)
    .where(eq(chirps.id,id))

  return result[0];
}

export async function getChirpsByAuthorId(authorId: string) {
  const result = await db
    .select()
    .from(chirps)
    .where(eq(chirps.userId, authorId))
    .orderBy(asc(chirps.createdAt));

  return result;
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user; 
}

export async function createRefreshToken(RefreshToken: NewRefreshToken) {
  const [result] = await db.insert(refreshTokens).values(RefreshToken).returning();
  return result; 
}

export async function RefreshbyToken(RefreshToken: string) {
  const [user] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, RefreshToken));
  return user; 
}

export async function updateRefreshToken(refreshToken: string) {
  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(refreshTokens.token, refreshToken));
}

export async function getUserFromRefreshToken(refreshToken: string) {
  const now = new Date();

  const [row] = await db
    .select({
      userId: users.id,
      email: users.email,
    })
    .from(refreshTokens)
    .innerJoin(users, eq(users.id, refreshTokens.userId))
    .where(
      and(
        eq(refreshTokens.token, refreshToken),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, now)
      )
    );

  return row; 
}




export async function updateuser(email: string, hashedPassword: string, userId: string) {
  const [updated] = await db
    .update(users)
    .set({
      email: email,
      hashedPassword: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return updated;
}

export async function deletechirps(id:string) {
 const result = await db.delete(chirps)
  .where(eq(chirps.id,id))

  return result;
}

export async function upgradeUserToChirpyRed(userId:string){
  const result = await db.update(users)
  .set({
     isChirpyRed :true,
     updatedAt: new Date(),
  })
  .where(eq(users.id,userId))
  return result;
}