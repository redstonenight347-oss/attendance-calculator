import express from 'express';
import { getUser, signup, signin, saveSubjects, getUserProfile, updateUserProfile } from "../controllers/users.controller.js";

const router = express.Router();


router.get("/", getUser);

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/:id/subjects", saveSubjects);
router.get("/:id", getUserProfile);
router.patch("/:id", updateUserProfile);

export default router;