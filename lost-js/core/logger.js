'use strict';
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const fmt = (lvl, msg) => `${stamp()} | ${lvl.padEnd(7)} | lost | ${msg}`;

module.exports = {
  info: (m) => console.log(fmt('INFO', m)),
  warn: (m) => console.warn(fmt('WARNING', m)),
  error: (m, err) => console.error(fmt('ERROR', m), err || ''),
};
