const Table = require('cli-table');
const chalk = require('chalk');

function title(str) {
  console.log(chalk.green.bold(str));
  console.log('====================================================');
}

function table(dependencies) {
  const table = new Table({
    head: ['name', 'local', 'upstream'],
    style: {
      compact: true
    }
  });

  Object.keys(dependencies).forEach(dependency => {
    const local = dependencies[dependency].local ? dependencies[dependency].local : ' ';
    const upstream = dependencies[dependency].upstream;
    table.push([
      String(dependency),
      String(local),
      String(upstream)
    ]);
  });

  console.log(table.toString());
}

function printReport(report) {
  console.log('');

  title('Summary');
  console.log(chalk.red('directory:'), report.directory);
  console.log(chalk.red('upstream:'), report.upstream.git);
  console.log(chalk.red('last commit hash:'), report.upstream.hash);
  console.log('');

  title('Diff');
  console.log(`ksdiff --diff ${report.directory} ${report.upstream.directory}`);
  console.log('');

  if (report.npm) {
    title('Updated NPM dependencies');
    Object.keys(report.npm).forEach(dependencies => {
      console.log(dependencies);
      table(report.npm[dependencies]);
    });
    console.log('');
  }

  if (report.typings) {
    title('Updated Typings dependencies');
    Object.keys(report.typings).forEach(dependencies => {
      console.log(dependencies);
      table(report.typings[dependencies]);
    });
    console.log('');
  }

  title('Update upstream information in package.json');
  console.log('  "upstream": {');
  console.log(`    "git": "${report.upstream.git}",`);
  console.log(`    "hash": "${report.upstream.hash}",`);
  console.log('  }');
  console.log('');
}

module.exports = printReport;