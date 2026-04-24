import express from "express";
import userRoutes from "./routes/users.router.js";
import attendanceRoutes from "./routes/attendance.router.js";


const app = express();
app.use(express.json());
app.use(express.static("public"));

app.use("/users", userRoutes);

app.use("/:userID/attendance", attendanceRoutes); 

export default app;