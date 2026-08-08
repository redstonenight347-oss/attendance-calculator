import { db } from "../db/db.js";
import { users, subjects } from "../db/schema.js";
import { eq, and, inArray } from "drizzle-orm";

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
  return await db.transaction(async (tx) => {
    const existingSubjects = await tx.select().from(subjects).where(eq(subjects.userId, parseInt(userId)));
    const existingIds = existingSubjects.map(s => s.id);

    const incomingIds = subjectList.map(s => s.id).filter(id => id != null);
    const toDeleteIds = existingIds.filter(id => !incomingIds.includes(id));

    if (toDeleteIds.length > 0) {
      await tx.delete(subjects).where(inArray(subjects.id, toDeleteIds));
    }

    for (const sub of subjectList) {
      if (sub.id && existingIds.includes(sub.id)) {
        await tx.update(subjects)
          .set({ name: sub.name })
          .where(eq(subjects.id, sub.id));
      } else {
        await tx.insert(subjects)
          .values({ userId: parseInt(userId), name: sub.name })
          .onConflictDoNothing();
      }
    }
    return true;
  });
}

export async function getUserById(id) {
  return await db
    .select()
    .from(users)
    .where(eq(users.id, parseInt(id)));
}

export async function updateUser(id, updateData) {
  return await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, parseInt(id)))
    .returning();
}

export async function updateUserPasswordService(id, hashedPassword) {
  return await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, parseInt(id)));
}