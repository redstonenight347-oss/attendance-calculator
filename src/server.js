import express from "express";
import { db } from "./models/db.js";
import { users, attendanceLogs} from "./models/schema.js";
import { eq } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/users", async (req, res) => {

  const { name, email } = req.body;

  try {
    await db.insert(users).values({ name, email});

    console.log("data inserted")
    res.json({ success: true});
  }
  catch (err) {
    res.status(500).json({ error: "failed to insert"});
  }

});


app.get("/users", async (req, res) => {
  const getname = req.query.name;

  try {
    const data = await db
    .select()
    .from(users)
    .where(eq(users.name, getname));

    console.log(getname);
    res.json(data);
  }
  catch (err) {
    res.status(500).json({ error: "Failed to fetch"})
  }

});


app.listen(3000, () => {
  console.log("Server is running")
});