import express from 'express';
import { getUser, signup, signin, saveSubjects, getUserProfile, updateUserProfile, verifyToken } from "../controllers/users.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();


router.get("/", getUser);

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/verify", authMiddleware, verifyToken);

router.post("/:id/subjects", authMiddleware, saveSubjects);
router.get("/:id", authMiddleware, getUserProfile);
router.patch("/:id", authMiddleware, updateUserProfile);

export default router;