const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bookingRoutes = require('./routes/booking.routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.use('/bookings', bookingRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;