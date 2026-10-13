jest.mock('../src/services/booking.service', () => ({
  createBooking: jest.fn(),
  listBookings: jest.fn(),
  rescheduleBooking: jest.fn(),
  cancelBooking: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');
const bookingService = require('../src/services/booking.service');

const bookingId = '507f1f77bcf86cd799439011';
const booking = { id: bookingId, status: 'Scheduled' };

afterEach(() => {
  jest.clearAllMocks();
});

describe('booking routes', () => {
  test('POST /bookings returns 201 with success and data', async () => {
    bookingService.createBooking.mockResolvedValue(booking);

    const response = await request(app)
      .post('/bookings')
      .send({
        consultant_id: 1,
        customer_id: 101,
        start_time: '2030-01-01T10:00:00Z',
        duration_minutes: 60
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: booking });
    expect(bookingService.createBooking).toHaveBeenCalledWith(expect.objectContaining({
      consultant_id: 1,
      customer_id: 101,
      start_time: new Date('2030-01-01T10:00:00Z')
    }));
  });

  test('GET /bookings returns count and data', async () => {
    bookingService.listBookings.mockResolvedValue([booking]);

    const response = await request(app)
      .get('/bookings')
      .query({ consultant_id: '1', status: 'Scheduled' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, count: 1, data: [booking] });
    expect(bookingService.listBookings).toHaveBeenCalledWith({
      consultant_id: 1,
      status: 'Scheduled'
    });
  });

  test('PATCH /bookings/:id validates and reschedules', async () => {
    bookingService.rescheduleBooking.mockResolvedValue(booking);

    const response = await request(app)
      .patch(`/bookings/${bookingId}`)
      .send({ duration_minutes: 45 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: booking });
    expect(bookingService.rescheduleBooking).toHaveBeenCalledWith(bookingId, {
      duration_minutes: 45
    });
  });

  test('DELETE /bookings/:id distinguishes first and repeated cancellation', async () => {
    bookingService.cancelBooking
      .mockResolvedValueOnce({ booking, alreadyCancelled: false })
      .mockResolvedValueOnce({ booking, alreadyCancelled: true });

    const firstResponse = await request(app).delete(`/bookings/${bookingId}`);
    const repeatedResponse = await request(app).delete(`/bookings/${bookingId}`);

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body).toEqual({
      success: true,
      message: 'Booking cancelled',
      data: booking
    });
    expect(repeatedResponse.status).toBe(200);
    expect(repeatedResponse.body).toEqual({
      success: true,
      message: 'Booking was already cancelled',
      data: booking
    });
  });
});
