const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const os = require('os');

const cachedir = path.join(os.homedir(), '.upstream-report');
const index = path.join(cachedir, 'index.json');

function getRandomString() {
  const table = [...new Array(26)].map((x, i) => String.fromCharCode('a'.charCodeAt(0) + i));
  return [...new Array(10)].map(() => table[Math.floor(Math.random() * table.length)]).join('');
}

function getRepositoryDirectory(git) {
  return path.basename(git, '.git') + '__' + getRandomString();
}

function getUpstream(npmPackage) {
  return new Promise((resolve, reject) => {
    if (!npmPackage.upstream) {
      reject(new Error('Undefined upstream options in package.json'));
      return;
    }
    
    const {git, hash} = npmPackage.upstream;
    let indexData;
    
    if (!fs.existsSync(cachedir)) {
      fs.mkdirSync(cachedir);
      indexData = {};
    } else if (!fs.existsSync(index)) {
      indexData = {};
    } else {
      indexData = JSON.parse(fs.readFileSync(index, {encoding: 'utf8'}));
    }
    
    if (!indexData.repositories) indexData.repositories = {};
    if (!indexData.repositories[git]) indexData.repositories[git] = getRepositoryDirectory(git);
    
    const upstreamDirectoryName = indexData.repositories[git];
    const upstreamDirectory = path.join(cachedir, upstreamDirectoryName);
    
    fs.writeFileSync(index, JSON.stringify(indexData), {encoding: 'utf8'});
    
    new Promise((resolve, reject) => {
      if (fs.existsSync(upstreamDirectory)) {
        simpleGit(upstreamDirectory).pull((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        })
      } else {
        simpleGit().clone(git, upstreamDirectory, ['--depth=1'], (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        })
      }
    }).then(() => {
      simpleGit(upstreamDirectory).revparse(['HEAD'], (err, head) => {
        if (err) {
          reject(err);
        } else {
          const headHash = String(head).trim();
          const updated = !hash || hash !== headHash;
          resolve({
            git,
            hash: headHash,
            directory: upstreamDirectory,
            updated
          });
        }
      })
    }).catch(err => reject(err))
  })
}

function diff(local, upstream, report, category, dependencies) {
  if (!upstream[dependencies]) return;
  
  const upstreamList = upstream[dependencies];
  const localList = local[dependencies] ? local[dependencies] : {};
  
  Object.keys(upstreamList).forEach(name => {
    if (localList[name] !== upstreamList[name]) {
      if (!report[category]) report[category] = {};
      if (!report[category][dependencies]) report[category][dependencies] = {};
      const diff = {upstream: upstreamList[name]};
      if (localList[name]) diff.local = localList[name];
      report[category][dependencies][name] = diff;
    }
  })
}

function addNpmPackageReport(report) {
  return new Promise(resolve => {
    const hasLocal = fs.existsSync(path.join(report.directory, 'package.json'));
    const hasUpstream = fs.existsSync(path.join(report.upstream.directory, 'package.json'));
    
    if (hasLocal && hasUpstream) {
      const local = JSON.parse(fs.readFileSync(path.join(report.directory, 'package.json')));
      const upstream = JSON.parse(fs.readFileSync(path.join(report.upstream.directory, 'package.json')));
      
      diff(local, upstream, report, 'npm', 'dependencies');
      diff(local, upstream, report, 'npm', 'devDependencies');
      diff(local, upstream, report, 'npm', 'peerDependencies');
      diff(local, upstream, report, 'npm', 'bundledDependencies');
      diff(local, upstream, report, 'npm', 'optionalDependencies');
    }
    
    resolve(report);
  })
}

function addTypingsDeclarationsReport(report) {
  return new Promise((resolve, reject) => {
    const hasLocal = fs.existsSync(path.join(report.directory, 'typings.json'));
    const hasUpstream = fs.existsSync(path.join(report.upstream.directory, 'typings.json'));
    
    if (hasLocal && hasUpstream) {
      const local = JSON.parse(fs.readFileSync(path.join(report.directory, 'typings.json')));
      const upstream = JSON.parse(fs.readFileSync(path.join(report.upstream.directory, 'typings.json')));
      
      diff(local, upstream, report, 'typings', 'dependencies');
      diff(local, upstream, report, 'typings', 'devDependencies');
      diff(local, upstream, report, 'typings', 'globalDependencies');
      diff(local, upstream, report, 'typings', 'ambientDependencies');
    }
    
    resolve(report);
  })
}

function report(directory) {
  return new Promise((resolve, reject) => {
    const file = path.join(directory, 'package.json');
    
    if (!fs.existsSync(file)) {
      reject(new Error(`Undefined file - ${file}`));
      return;
    }
    
    const npmPackage = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'}));
    
    getUpstream(npmPackage)
      .then(upstream => addNpmPackageReport({directory, upstream}))
      .then(report => addTypingsDeclarationsReport(report))
      .then(report => resolve(report))
      .catch(err => reject(err));
  })
}

module.exports = report;