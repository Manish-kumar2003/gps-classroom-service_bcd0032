const express = require('express');
const client = require('prom-client');

const app = express();
const port = 3000;

// Classroom GPS values
const classroomName = "AA103";
const latitude = "9.754998007386021";
const longitude = "76.6502343174669";
const building = "Academic Block-1";

// Prometheus default metrics
client.collectDefaultMetrics();

// Custom metrics
const httpRequestCounter = new client.Counter({
  name: 'gps_service_requests_total',
  help: 'Total number of requests to the GPS microservice',
  labelNames: ['method', 'route', 'status_code']
});

const locationRequestCounter = new client.Counter({
  name: 'gps_location_requests_total',
  help: 'Total number of requests to the /location endpoint'
});

const requestDuration = new client.Histogram({
  name: 'gps_service_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2]
});

app.use(express.json());

// Metrics middleware
app.use((req, res, next) => {
  const end = requestDuration.startTimer();
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    });

    end({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    });
  });
  next();
});

app.get('/', (req, res) => {
  res.json({
    service: 'gps-classroom-service',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.get('/location', (req, res) => {
  locationRequestCounter.inc();

  res.json({
    classroom: classroomName,
    building: building,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    maps_url: `https://www.google.com/maps?q=${latitude},${longitude}`
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(port, () => {
  console.log(`GPS service running on port ${port}`);
});