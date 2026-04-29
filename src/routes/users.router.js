import express from 'express';
import { getUser, signup, signin } from "../controllers/users.controller.js";

const router = express.Router();


router.get("/", getUser);

router.post("/signup", signup);
router.post("/signin", signin);


export default router;