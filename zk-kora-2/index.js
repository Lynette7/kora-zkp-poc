const fs = require('fs');
const csv = require('csv-parser');

let speeds = [];
fs.createReadStream('./telematics.csv')
  .pipe(csv())
  .on('data', (row) => {
    speeds.push(parseFloat(row.speed_kmh));
  })
  .on('end', () => {
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    console.log(`Average Speed (over ${speeds.length} rows): ${avgSpeed.toFixed(2)} km/h`);
    // For your sample: 206.0, 122.0, ... (5,777 total)
  });