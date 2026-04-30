import { db } from "../db/db.js";
import { users, subjects } from "../db/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import { clearUserCache } from "./attendance.services.js";
 
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

export async function saveSubjectsService(userId, subjectList) {
  clearUserCache(userId);

  const existingSubjects = await db.select().from(subjects).where(eq(subjects.userId, parseInt(userId)));
  const existingIds = existingSubjects.map(s => s.id);
  
  const incomingIds = subjectList.map(s => s.id).filter(id => id != null);
  const toDeleteIds = existingIds.filter(id => !incomingIds.includes(id));
  
  if (toDeleteIds.length > 0) {
    await db.delete(subjects).where(inArray(subjects.id, toDeleteIds));
  }
  
  for (const sub of subjectList) {
    if (sub.id && existingIds.includes(sub.id)) {
      await db.update(subjects)
        .set({ name: sub.name })
        .where(eq(subjects.id, sub.id));
    } else {
      await db.insert(subjects)
        .values({ userId: parseInt(userId), name: sub.name })
        .onConflictDoNothing();
    }
  }
  return true;
}