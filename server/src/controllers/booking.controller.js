const bookingService = require('../services/booking.service');
const asyncHandler = require('../utils/asyncHandler');

const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.body);
  res.status(201).json({ success: true, data: booking });
});

const listBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listBookings(req.query);
  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

const rescheduleBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.rescheduleBooking(req.params.id, req.body);
  res.status(200).json({ success: true, data: booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const { booking, alreadyCancelled } = await bookingService.cancelBooking(req.params.id);
  res.status(200).json({
    success: true,
    message: alreadyCancelled ? 'Booking was already cancelled' : 'Booking cancelled',
    data: booking
  });
});

module.exports = {
  createBooking,
  listBookings,
  rescheduleBooking,
  cancelBooking
};