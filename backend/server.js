const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const analysisRoutes = require('./routes/analysis');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', analysisRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ARIA security layer is live' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'aria-backend' });
});

module.exports = app;

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}