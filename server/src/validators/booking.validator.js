const { z } = require('zod');

const positiveInteger = (field) => z.number({
  invalid_type_error: `${field} must be a positive integer`
})
  .int(`${field} must be a positive integer`)
  .positive(`${field} must be greater than 0`);

const startTimeSchema = z.string({
  required_error: 'start_time is required',
  invalid_type_error: 'start_time must be an ISO 8601 datetime with timezone'
})
  .datetime({
    offset: true,
    message: 'start_time must be an ISO 8601 datetime with timezone'
  })
  .transform((value) => new Date(value));

const durationMinutesSchema = positiveInteger('duration_minutes')
  .max(480, 'duration_minutes must not exceed 480');

const createBookingSchema = z.object({
  consultant_id: positiveInteger('consultant_id'),
  customer_id: positiveInteger('customer_id'),
  start_time: startTimeSchema,
  duration_minutes: durationMinutesSchema
});

const updateBookingSchema = z.object({
  start_time: startTimeSchema.optional(),
  duration_minutes: durationMinutesSchema.optional()
})
  .strict()
  .refine(
    (booking) => booking.start_time !== undefined || booking.duration_minutes !== undefined,
    {
      message: 'At least one of start_time or duration_minutes must be provided'
    }
  );

const bookingIdParamSchema = z.object({
  id: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'id must be a valid 24-character Mongo ObjectId')
});

const listBookingsQuerySchema = z.object({
  consultant_id: z.coerce.number({
    invalid_type_error: 'consultant_id must be a positive integer'
  })
    .int('consultant_id must be a positive integer')
    .positive('consultant_id must be greater than 0')
    .optional(),
  status: z.enum(['Scheduled', 'Completed', 'Cancelled']).optional()
});

module.exports = {
  createBookingSchema,
  updateBookingSchema,
  bookingIdParamSchema,
  listBookingsQuerySchema
};