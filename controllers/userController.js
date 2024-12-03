const User = require('../models/User');

// Register a new user
const registerUser = async (req, res) => {
  const { email, password, user_type, name } = req.body;

  try {
    const newUser = new User({ email, password, user_type, name });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!', user: newUser });
  } catch (error) {
    res.status(400).json({ message: 'Error registering user', error });
  }
};

module.exports = { registerUser };
