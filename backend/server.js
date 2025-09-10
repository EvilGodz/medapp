const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medRemind', require('./middleware/auth'), require('./routes/medRemind'));
app.use('/api/dose-history', require('./middleware/auth'), require('./routes/doseHistory'));
app.use('/api/medicines', require('./routes/medicines'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Medicine App API is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});