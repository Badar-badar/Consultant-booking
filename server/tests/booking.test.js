const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');
const Booking = require('../src/models/Booking');
const Consultant = require('../src/models/Consultant');
const Customer = require('../src/models/Customer');

jest.setTimeout(60_000);

let mongoServer;

function utcDate(dayOffset, hour, minute = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function bookingPayload({
  consultant_id = 1,
  customer_id = 101,
  start_time = utcDate(1, 10),
  duration_minutes = 60
} = {}) {
  return {
    consultant_id,
    customer_id,
    start_time: start_time.toISOString(),
    duration_minutes
  };
}

async function createBooking(options) {
  return request(app).post('/bookings').send(bookingPayload(options));
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await Consultant.insertMany([
    { consultantId: 1, name: 'Consultant One' },
    { consultantId: 2, name: 'Consultant Two' }
  ]);
  await Customer.insertMany([
    { customerId: 101, name: 'Customer One' },
    { customerId: 102, name: 'Customer Two' }
  ]);
});

beforeEach(async () => {
  await Booking.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('booking API', () => {
  test('rejects an overlapping booking for the same consultant', async () => {
    await createBooking();

    const response = await createBooking({
      start_time: utcDate(1, 10, 30)
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SLOT_CONFLICT');
  });

  test('allows touching boundaries and bookings with different consultants', async () => {
    await createBooking();

    const before = await createBooking({
      start_time: utcDate(1, 9, 30),
      duration_minutes: 30
    });
    const after = await createBooking({
      start_time: utcDate(1, 11),
      duration_minutes: 30
    });
    const otherConsultant = await createBooking({
      consultant_id: 2,
      start_time: utcDate(1, 10, 30),
      duration_minutes: 30
    });

    expect(before.status).toBe(201);
    expect(after.status).toBe(201);
    expect(otherConsultant.status).toBe(201);
  });

  test('rejects partial overlaps', async () => {
    await createBooking({
      start_time: utcDate(1, 13),
      duration_minutes: 60
    });

    const response = await createBooking({
      start_time: utcDate(1, 13, 30),
      duration_minutes: 45
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SLOT_CONFLICT');
  });

  test('cancellation keeps the record visible and frees the slot', async () => {
    const created = await createBooking();
    const id = created.body.data.id;

    const cancelled = await request(app).delete(`/bookings/${id}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('Cancelled');

    const listed = await request(app).get('/bookings');
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0]).toMatchObject({
      id,
      status: 'Cancelled'
    });

    const replacement = await createBooking();
    expect(replacement.status).toBe(201);
  });

  test('repeated cancellation does not update the booking timestamp', async () => {
    const created = await createBooking();
    const id = created.body.data.id;
    await request(app).delete(`/bookings/${id}`);
    const updatedAtAfterFirstDelete = (await Booking.findById(id)).updatedAt;

    const repeated = await request(app).delete(`/bookings/${id}`);

    expect(repeated.status).toBe(200);
    expect(repeated.body.message).toBe('Booking was already cancelled');
    expect((await Booking.findById(id)).updatedAt).toEqual(updatedAtAfterFirstDelete);
  });

  test('failed reschedule leaves the original booking unchanged', async () => {
    await createBooking({
      start_time: utcDate(1, 10),
      duration_minutes: 60
    });
    const original = await createBooking({
      start_time: utcDate(1, 12),
      duration_minutes: 30
    });
    const id = original.body.data.id;
    const before = await Booking.findById(id).lean();

    const response = await request(app)
      .patch(`/bookings/${id}`)
      .send({
        start_time: utcDate(1, 10, 30).toISOString(),
        duration_minutes: 30
      });

    const after = await Booking.findById(id).lean();
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SLOT_CONFLICT');
    expect(after).toEqual(before);
  });

  test('rescheduling to a slot overlapping only the booking own old time is allowed', async () => {
    const created = await createBooking({
      start_time: utcDate(1, 10),
      duration_minutes: 60
    });
    const id = created.body.data.id;

    const response = await request(app)
      .patch(`/bookings/${id}`)
      .send({
        start_time: utcDate(1, 10, 30).toISOString(),
        duration_minutes: 60
      });

    expect(response.status).toBe(200);
    expect(response.body.data.start_time).toBe(utcDate(1, 10, 30).toISOString());
    expect(response.body.data.end_time).toBe(utcDate(1, 11, 30).toISOString());
  });

  test.each(['Cancelled', 'Completed'])(
    'rejects rescheduling a %s booking',
    async (status) => {
      const created = await createBooking();
      await Booking.findByIdAndUpdate(created.body.data.id, { status });

      const response = await request(app)
        .patch(`/bookings/${created.body.data.id}`)
        .send({ duration_minutes: 45 });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BOOKING_NOT_RESCHEDULABLE');
    }
  );

  test('rejects past starts, invalid durations, and an unknown consultant', async () => {
    const pastStart = await createBooking({
      start_time: utcDate(-1, 10)
    });
    const zeroDuration = await createBooking({ duration_minutes: 0 });
    const negativeDuration = await createBooking({ duration_minutes: -5 });
    const unknownConsultant = await createBooking({ consultant_id: 999 });

    expect(pastStart.status).toBe(400);
    expect(pastStart.body.error.code).toBe('PAST_START_TIME');
    expect(zeroDuration.status).toBe(400);
    expect(negativeDuration.status).toBe(400);
    expect(unknownConsultant.status).toBe(404);
    expect(unknownConsultant.body.error.code).toBe('CONSULTANT_NOT_FOUND');
  });

  test('reports validation details for missing fields', async () => {
    const response = await request(app).post('/bookings').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'consultant_id' }),
      expect.objectContaining({ field: 'customer_id' }),
      expect.objectContaining({ field: 'start_time' }),
      expect.objectContaining({ field: 'duration_minutes' })
    ]));
  });

  test('rejects malformed booking IDs on PATCH', async () => {
    const response = await request(app)
      .patch('/bookings/not-an-object-id')
      .send({ duration_minutes: 45 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('filters bookings by consultant_id', async () => {
    await createBooking({ consultant_id: 1 });
    await createBooking({
      consultant_id: 2,
      start_time: utcDate(1, 12)
    });

    const response = await request(app).get('/bookings').query({ consultant_id: '1' });

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].consultant_id).toBe(1);
  });
});
