'use strict';

const net = require('net');
const dgram = require('dgram');
const Q = require('q');

let debug = false;

// grab useful args and map them into an object
let getArgs = (argv) => {
	let usefulArgs = { tcp: 'true' };

	argv.slice(2).forEach((data) => {
		if (data.indexOf('--') !== -1) {
			let equals = data.indexOf('=');

			usefulArgs[data.slice(2, equals)] = data.slice(equals + 1);
		}
	});

	debug && console.log(usefulArgs);

	return usefulArgs;
};

// Initially, we'll make this super simple and just parse one host.
// In the future, it will be capable of supporting multiple hosts and
// a range/subnet.
let parseHosts = (hosts) => {
	debug && console.log(hosts);

	let commaHosts = hosts.split(',');

	return commaHosts;
};

// Same as above.
let parsePorts = (ports) => {
	debug && console.log(ports);

	if (ports.indexOf('-') !== -1) {
		return ports.split(',').map((port) => {
			if (port.indexOf('-') !== -1) {
				let interval = port.split('-');
				let length = interval[1] - interval[0] + 1;

				return Array.from(Array(length).keys())
							.map(x => x + parseInt(interval[0])).map(String);
			}
			return port;
		}).reduce((first, second) => first.concat(second), []);
	}
	else return ports.split(',');
};

// Scan the hosts and the ports. Eventually, it would be nice to scan
// the hosts concurrently, but this is just super simple right now.
let tcpScan = (host, port) => {
	// This is assuming there is only one host and one port. This will
	// be built up later.
	let socket = net.createConnection(port, host);
	socket.setTimeout(2000);

	let result = { host, port, type: 'TCP' };

	let deferred = Q.defer();

	// Create callback functions for each possible result.
	socket.on('error', (err) => {
		result.status = {};

		if (err.message.indexOf('ECONNREFUSED') !== -1) {
			result.status.state = 'closed';
			result.status.reason = 'connection refused';
		}
		else if (err.message.indexOf('EHOSTUNREACH') !== -1) {
			result.status.state = 'closed';
			result.status.reason = 'host unreachable';
		}
		else
			result.status.state = err.message;

		debug && console.log('error');
	});
	socket.on('timeout', () => {
		result.status = {};

		if (result.isOpen) result.status.state = 'open';
		else {
			result.status.state = 'closed';
			result.status.reason = 'connection timed out';
		}

		debug && console.log('timeout');

		socket.destroy();
	});
	socket.on('connect', () => {
		result.isOpen = true;
		debug && console.log('connect');
	});
	socket.on('data', (data) => {
		// This might be useful later to get port information
		result.receivedData = true;

		debug && console.log('data');

		socket.destroy();
	});
	socket.on('close', () => {
		if (!result.receivedData && result.isOpen) {
			result.status = {};
			result.isOpen = false;
			result.status.state = 'open';
			result.status.reason = 'no data received';
		}

		socket.destroy();

		debug && console.log('close');

		// It appears that 'close' is always called at the end, so
		// I feel that putting the deferred.resolve here is probably
		// sufficient.
		deferred.resolve(result);
	});

	return deferred.promise;
};

// The udp version of the scan
let udpScan = (host, port) => {
	const buffer = new Buffer('Some bytes');
	const socket = dgram.createSocket('udp4');

	let deferred = Q.defer();
	let result = { host, port, type: 'UDP' };

	socket.send(buffer, 0, buffer.length, port, host, (err) => {
		result.data = err;
		deferred.resolve(result);
		socket.close();
	});

	return deferred.promise;
}

let args = getArgs(process.argv);
let hosts = parseHosts(args.hosts);
let ports = parsePorts(args.ports);

let tcpScans = [];
let udpScans = [];

// Gather scans
hosts.forEach((host) => {
	ports.forEach((port) => {
		if (args.tcp === 'true') tcpScans.push(tcpScan(host, port));
		if (args.udp === 'true') udpScans.push(udpScan(host, port));
	});
});

let allScans = tcpScans.concat(udpScans);

// Because those socket calls are asynchronous, we need to
// wait until we get data back from those calls.
Q.all(allScans).then((results) => {
	debug && console.log(results);

	results.sort((a, b) => a.host.split('.')[3] - b.host.split('.')[3])
	.forEach((result) => {
		let output = result.host + ':' + result.port + '\t' + result.type + '\t';

		if (result.type === 'TCP') {
			if (result.isOpen) output += 'open';
			else if (result.status) output += result.status.state + ' (' + result.status.reason + ')';
		}
		else if (result.type === 'UDP') {
			if (result.data || result.data === 0) output += 'closed';
			else output += 'maybe open (no data or error received)';
		}

		console.log(output);
	});
});