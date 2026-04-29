import { db } from "../db/db.js";
import { users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
 
export async function getUserByName(name) {
  console.log("GET service hit");
  return await db
    .select()
    .from(users)
    .where(eq(users.name, name));
}

export async function getUserByEmail(email) {
  return await db
    .select()
    .from(users)
    .where(eq(users.email, email));
}

export async function createUserService(name, email, password) {
  console.log("POST service hit");

  const [newUser] = await db
      .insert(users).values({
        name: name,
        email: email,
        password: password,
      })
      .returning();

  return newUser;
}