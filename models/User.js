const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  user_type: { type: String, enum: ['student', 'admin', 'institute'], required: true },
  name: { type: String, required: false },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
