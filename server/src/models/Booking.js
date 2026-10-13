const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  consultantId: {
    type: Number,
    required: true,
    index: true
  },
  customerId: {
    type: Number,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  cancelledAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      return {
        id: ret._id.toString(),
        consultant_id: ret.consultantId,
        customer_id: ret.customerId,
        start_time: ret.startTime.toISOString(),
        duration_minutes: ret.durationMinutes,
        end_time: ret.endTime.toISOString(),
        status: ret.status,
        cancelled_at: ret.cancelledAt ? ret.cancelledAt.toISOString() : null,
        created_at: ret.createdAt.toISOString(),
        updated_at: ret.updatedAt.toISOString()
      };
    }
  }
});

bookingSchema.index({
  consultantId: 1,
  status: 1,
  startTime: 1,
  endTime: 1
});

module.exports = mongoose.models.Booking
  || mongoose.model('Booking', bookingSchema);