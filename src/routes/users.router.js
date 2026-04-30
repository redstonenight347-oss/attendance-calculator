import express from 'express';
import { getUser, signup, signin, saveSubjects } from "../controllers/users.controller.js";

const router = express.Router();


router.get("/", getUser);

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/:id/subjects", saveSubjects);

export default router;