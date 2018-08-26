'use strict';

const net   = require('net');
const dgram = require('dgram');
const Q     = require('q');
const ping  = require('net-ping');

const debug = true;

// If running from a terminal/command prompt.
if (require.main === module) {
  debug && console.log('Called from a terminal/command prompt.');

  const terminal = require('./terminal');
  process.exitCode = terminal.execute(commander, process.argv);
}

// Otherwise, build Node.js module.
exports = {
  options: {},
  scan: require('scan'),
  ping: require('scan')('icmp'),
  tcpScan: require('scan')('tcp'),
  udpScan: require('scan')('udp')
}