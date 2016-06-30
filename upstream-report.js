const path = require('path');
const report = require('./index');
const printReport = require('./printReport');

const target = (process.argv && process.argv.length > 2) ? process.argv[2] : '.';
const directory = path.resolve(process.cwd(), target);

report(directory)
  .then(report => {
    if (!report.upstream.updated) {
      console.log('- No updated upstream.');
    } else {
      printReport(report);
    }
  })
  .catch(err => console.error(err))

