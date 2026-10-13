const Booking = require('../models/Booking');
const Consultant = require('../models/Consultant');
const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

async function findConflict({ consultantId, startTime, endTime, excludeBookingId }) {
  const query = {
    consultantId,
    status: 'Scheduled',
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  // Strict inequalities allow one booking to start exactly when another ends.
  return Booking.findOne(query);
}

async function createBooking({ consultant_id, customer_id, start_time, duration_minutes }) {
  const [consultant, customer] = await Promise.all([
    Consultant.findOne({ consultantId: consultant_id }),
    Customer.findOne({ customerId: customer_id })
  ]);

  if (!consultant) {
    throw new AppError(404, 'Consultant not found', 'CONSULTANT_NOT_FOUND');
  }

  if (!customer) {
    throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  if (start_time <= new Date()) {
    throw new AppError(400, 'start_time must be in the future', 'PAST_START_TIME');
  }

  const endTime = addMinutes(start_time, duration_minutes);
  const conflict = await findConflict({
    consultantId: consultant_id,
    startTime: start_time,
    endTime
  });

  if (conflict) {
    throw new AppError(
      409,
      'Consultant is not available for the requested time slot',
      'SLOT_CONFLICT',
      [{
        start_time: conflict.startTime.toISOString(),
        end_time: conflict.endTime.toISOString()
      }]
    );
  }

  return Booking.create({
    consultantId: consultant_id,
    customerId: customer_id,
    startTime: start_time,
    durationMinutes: duration_minutes,
    endTime,
    status: 'Scheduled'
  });
}

async function listBookings({ consultant_id, status } = {}) {
  const filter = {};

  if (consultant_id !== undefined) {
    filter.consultantId = consultant_id;
  }

  if (status !== undefined) {
    filter.status = status;
  }

  return Booking.find(filter).sort({ startTime: 1 });
}

async function getBookingById(id) {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  }
  return booking;
}

async function rescheduleBooking(id, { start_time, duration_minutes }) {
  const booking = await getBookingById(id);

  if (booking.status !== 'Scheduled') {
    throw new AppError(
      422,
      'Only Scheduled bookings can be rescheduled',
      'BOOKING_NOT_RESCHEDULABLE'
    );
  }

  const newStart = start_time ?? booking.startTime;
  const newDuration = duration_minutes ?? booking.durationMinutes;

  if (newStart <= new Date()) {
    throw new AppError(400, 'start_time must be in the future', 'PAST_START_TIME');
  }

  const newEnd = addMinutes(newStart, newDuration);
  const conflict = await findConflict({
    consultantId: booking.consultantId,
    startTime: newStart,
    endTime: newEnd,
    excludeBookingId: id
  });

  if (conflict) {
    throw new AppError(
      409,
      'Consultant is not available for the requested time slot',
      'SLOT_CONFLICT',
      [{
        start_time: conflict.startTime.toISOString(),
        end_time: conflict.endTime.toISOString()
      }]
    );
  }

  booking.startTime = newStart;
  booking.durationMinutes = newDuration;
  booking.endTime = newEnd;
  return booking.save();
}

async function cancelBooking(id) {
  const booking = await getBookingById(id);

  if (booking.status === 'Cancelled') {
    return { booking, alreadyCancelled: true };
  }

  if (booking.status === 'Completed') {
    throw new AppError(422, 'Completed bookings cannot be cancelled', 'BOOKING_NOT_CANCELLABLE');
  }

  booking.status = 'Cancelled';
  booking.cancelledAt = new Date();
  await booking.save();
  return { booking, alreadyCancelled: false };
}

module.exports = {
  findConflict,
  createBooking,
  listBookings,
  getBookingById,
  rescheduleBooking,
  cancelBooking,
  addMinutes
};