const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const db = require('./utils/db')
const app = express();
require('dotenv').config()

// const ResultScheduler = require('./utils/resultScheduler');
const adminRoutes = require("./routes/admin")
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/user")

app.use(express.json());
// app.use(cors({
//   origin: true,
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600
}));
db();
db().then(function (db) {
  console.log(`Db connnected`)
})
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);


app.get("/testing", (req, res) => {
  res.sendFile(__dirname + "/testingpayement.html");
})
app.get("/Spinner", (req, res) => {
  res.sendFile(__dirname + "/Spinner.html");
})
app.get("/deposit", (req, res) => {
  res.sendFile(__dirname + "/manual-deposit.html");
})



