import { getUserByName, createUserService } from "../services/users.services.js";


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

export async function createUser(req, res) {
  
  try {
    const { name, email} = req.body;

    if(!name || name.trim() === "") {
      return res.status(400).json({ message: "*name required"});
    }
    if(!email || email.trim() === "") {
      return res.status(400).json({ message: "*email required"}); 
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "*valid email required"});
    }

    console.log("Name: " + name,"Email: " + email)
    await createUserService(name, email);


    res.json({message: "User inserted"});
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "User couldn't insert"});
  }

};