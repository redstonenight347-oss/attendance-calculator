import express from 'express';
import { getUserByName, createUserService } from "../services/users.services.js";


const app = express();

app.use(express.json());

export async function getUser(req, res){

  try {
    const name = req.query.name;

    if(!name || name.trim() === "") {
      return res.status(400).json({ error: "Name required"});
    }

    console.log("Name: " + name);
    const user = await getUserByName(name);

    if(!user || user === []){
      res.status(500).json({ error: "Failed to get user details" });
      return;
    }

    res.json(user)  
  }
  catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "Failed to get user details" });
  }

};

export async function createUser(req, res) {
  
  try {
    const { name, email} = req.body;

    if(!name || name.trim() === "") {
      res.status(400).json({ error: "Name required"});
      return;
    }
    if(!email || email.trim() === "") {
      res.status(400).json({ error: "email required"});
      return;
    }


    console.log("Name: " + name,"Email: " + email)
    await createUserService(name, email);

    res.json({message: "User inserted"});
  }
  catch (err) {
    console.log(err);
    res.status(500).json({error: "User couldn't insert"});
  }

};