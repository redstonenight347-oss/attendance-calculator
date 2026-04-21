import express from 'express';
import { getUser, createUser } from "../controllers/users.controller.js";

const router = express.Router();


router.get("/", getUser);

router.post("/", createUser);


export default router;




















// export async function createUser(req, res) {
//   const name = req.body.name;
//   const email = req.body.email;

//   try {
//     await db
//       .insert(users).values({
//         name: name,
//         email: email,
//       })

//     res.json({message: "User inserted"})
//   }
//   catch (err) {
//     console.log(err.message);
//     res.status(500).json({error: "Couldn't insert"});
//   }

// };


// // export default app;