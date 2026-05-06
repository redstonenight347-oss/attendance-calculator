import { getUserByName, createUserService, getUserByEmail, saveSubjectsService, getUserById, updateUser, updateUserPasswordService } from "../services/users.services.js";
import { clearUserCache } from "../services/attendance.services.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await createUserService(name, email, hashedPassword);

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ 
      message: "User signed up successfully", 
      userId: newUser.id,
      token: token
    });
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
    let isMatch = false;

    // Try bcrypt comparison first
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (e) {
      // If comparison fails due to invalid hash format, it might be plaintext
      isMatch = false;
    }

    // Fallback for existing plaintext passwords
    if (!isMatch && password === user.password) {
      isMatch = true;
      // Auto-migrate to hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await updateUserPasswordService(user.id, hashedPassword);
      console.log(`Migrated user ${user.email} to hashed password`);
    }
    
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ 
      message: "Signed in successfully", 
      userId: user.id, 
      name: user.name,
      token: token
    });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Sign in failed" });
  }
}


export async function verifyToken(req, res) {
  // req.user is populated by authMiddleware
  res.json({ 
    valid: true, 
    user: req.user 
  });
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

export async function getUserProfile(req, res) {
  try {
    const { id } = req.params;
    const users = await getUserById(id);
    
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(users[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get user profile" });
  }
}

export async function updateUserProfile(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required" });
    }
    
    const updatedUsers = await updateUser(id, name);
    
    if (!updatedUsers || updatedUsers.length === 0) {
      return res.status(500).json({ message: "Failed to update user profile" });
    }
    
    clearUserCache(id);
    res.json({ message: "Profile updated successfully", user: updatedUsers[0] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to update user profile" });
  }
}