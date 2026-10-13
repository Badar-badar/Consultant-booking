require('dotenv').config();

const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Consultant = require('../models/Consultant');
const Customer = require('../models/Customer');

function utcDateFromNow(dayOffset, hour, minute) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function makeBooking(consultantId, customerId, startTime, durationMinutes, status) {
  return {
    consultantId,
    customerId,
    startTime,
    durationMinutes,
    endTime: new Date(startTime.getTime() + durationMinutes * 60_000),
    status
  };
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await Promise.all([
      Consultant.deleteMany({}),
      Customer.deleteMany({}),
      Booking.deleteMany({})
    ]);

    const consultants = await Consultant.insertMany([
      { consultantId: 1, name: 'Alex Morgan', email: 'alex@example.com' },
      { consultantId: 2, name: 'Jordan Lee', email: 'jordan@example.com' },
      { consultantId: 3, name: 'Taylor Smith', email: 'taylor@example.com' }
    ]);

    const customers = await Customer.insertMany([
      { customerId: 101, name: 'Casey Brown', email: 'casey@example.com' },
      { customerId: 102, name: 'Riley Davis', email: 'riley@example.com' },
      { customerId: 103, name: 'Morgan Wilson', email: 'morgan@example.com' },
      { customerId: 104, name: 'Jamie Garcia', email: 'jamie@example.com' }
    ]);

    const bookings = await Booking.insertMany([
      makeBooking(1, 101, utcDateFromNow(1, 10, 0), 60, 'Scheduled'),
      makeBooking(1, 102, utcDateFromNow(1, 14, 0), 60, 'Scheduled'),
      makeBooking(1, 103, utcDateFromNow(2, 14, 0), 30, 'Cancelled'),
      makeBooking(1, 104, utcDateFromNow(-1, 9, 0), 30, 'Completed')
    ]);

    console.log(
      `Seed complete: ${consultants.length} consultants, ${customers.length} customers, ${bookings.length} bookings`
    );
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});