import { db } from "../db/db.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
 
export async function getUserByName(name) {
  console.log("GET services hit");
  return await db
    .select()
    .from(users)
    .where(eq(users.name, name));
}

export async function createUserService(name, email) {
  console.log("POST services hit");

  await db
      .insert(users).values({
        name: name,
        email: email,
      })

}