const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'Helper4U API is running' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/helpers', require('./routes/helperRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
