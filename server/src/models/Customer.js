const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: {
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

module.exports = mongoose.models.Customer
  || mongoose.model('Customer', customerSchema);