const mongoose = require('mongoose');

const consultantSchema = new mongoose.Schema({
  consultantId: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: String
});

module.exports = mongoose.models.Consultant
  || mongoose.model('Consultant', consultantSchema);