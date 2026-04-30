import { getUserByName, createUserService, getUserByEmail, saveSubjectsService } from "../services/users.services.js";


export async function getUser(req, res){

  try {
    const name = req.query.name;

    if(!name || name.trim() === "") {
      return res.status(400).json({ message: "*name required"});
    }

    console.log("Name: " + name);
    const user = await getUserByName(name);

    if(!user || user.length === 0){
      return res.status(500).json({ message: "failed to get user details" });   
    }

    
    console.log(user[0])
    res.json(user[0])  
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "failed to get user details" });
  }

};

export async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    if(!name || name.trim() === "") {
      return res.status(400).json({ message: "*name required"});
    }
    if(!email || email.trim() === "") {
      return res.status(400).json({ message: "*email required"}); 
    }
    if(!password || password.trim() === "") {
      return res.status(400).json({ message: "*password required"}); 
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "*valid email required"});
    }

    const existingUsers = await getUserByEmail(email);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const userId = await createUserService(name, email, password);

    res.json({ message: "User signed up successfully", userId: userId.id });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "User couldn't sign up" });
  }
}

export async function signin(req, res) {
  try {
    const { email, password } = req.body;

    if(!email || email.trim() === "") {
      return res.status(400).json({ message: "*email required"}); 
    }
    if(!password || password.trim() === "") {
      return res.status(400).json({ message: "*password required"}); 
    }

    const users = await getUserByEmail(email);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({ message: "Signed in successfully", userId: user.id, name: user.name });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Sign in failed" });
  }
}

export async function saveSubjects(req, res) {
  try {
    const { id } = req.params;
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects)) {
      return res.status(400).json({ message: "Subjects array is required" });
    }

    await saveSubjectsService(id, subjects);

    res.json({ message: "Subjects saved successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to save subjects" });
  }
}