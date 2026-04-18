import { db } from "./db.js";
import { users, timetable, attendanceLogs } from "./schema.js";

const test = async (tempUsers) => {

  for (const TUser of tempUsers) {
    await db.insert(users).values([{
      name: TUser.name,
      email: TUser.email,
    }]);
  }
  
  const result = await db.select().from(users);

  console.log(result);

  // await db.delete(users);

};

const tempUsers = [{
  name: "Siddharth Udupa",
  email: "test1@test.com",
},{
  name: "Govida Gopala Pai",
  email: "test2@test.com",
},{
  name: "Narendra Modi",
  email: "test3@test.com",
},];

test(tempUsers);
