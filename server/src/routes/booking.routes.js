const express = require('express');
const validate = require('../middleware/validate');
const {
  createBookingSchema,
  updateBookingSchema,
  bookingIdParamSchema,
  listBookingsQuerySchema
} = require('../validators/booking.validator');
const bookingController = require('../controllers/booking.controller');

const router = express.Router();

router.route('/')
  .post(
    validate(createBookingSchema, 'body'),
    bookingController.createBooking
  )
  .get(
    validate(listBookingsQuerySchema, 'query'),
    bookingController.listBookings
  );

router.patch(
  '/:id',
  validate(bookingIdParamSchema, 'params'),
  validate(updateBookingSchema, 'body'),
  bookingController.rescheduleBooking
);

router.delete(
  '/:id',
  validate(bookingIdParamSchema, 'params'),
  bookingController.cancelBooking
);

module.exports = router;