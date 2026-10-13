require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

async function startServer() {
  await connectDB();
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;