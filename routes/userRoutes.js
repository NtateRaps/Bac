const express = require('express');
const { registerUser } = require('../controllers/userController');

const router = express.Router();

router.post('/users', registerUser);

module.exports = router;
