'use strict';

const net = require('net');
const dgram = require('dgram');
const Q = require('q');

let debug = false;

// grab useful args and map them into an object
let getArgs = (argv) => {
	let usefulArgs = {};

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
	return hosts;
};

// Same to above.
let parsePorts = (ports) => {
	debug && console.log(ports);
	return ports;
};

// Scan the hosts and the ports. Eventually, it would be nice to scan
// the hosts concurrently, but this is just super simple right now.
let scan = (hosts, ports) => {
	// This is assuming there is only one host and one port. This will
	// be built up later.
	let socket = net.createConnection(ports, hosts);
	socket.setTimeout(2000);

	let result = {
		status: {}
	};

	let deferred = Q.defer();

	// Create callback functions for each possible result.
	socket.on('error', (err) => {
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
	});
	socket.on('timeout', () => {
		if (result.isOpen) result.status.state = 'open';
		else {
			result.status.state = 'closed';
			result.status.reason = 'connection timed out';
		}

		socket.destroy();
	});
	socket.on('connect', () => {
		result.isOpen = true;
	});
	socket.on('data', (data) => {
		// This might be useful later to get port information
		// console.log(data);
		result.receivedData = true;

		socket.destroy();
	});
	socket.on('close', () => {
		if (!result.receivedData) result.isOpen = false;

		socket.destroy();

		// It appears that 'close' is always called at the end, so
		// I feel that putting the deferred.resolve here is probably
		// sufficient.
		deferred.resolve(result);
	});

	return deferred.promise;
};

let args = getArgs(process.argv);
let hosts = parseHosts(args.hosts);
let ports = parsePorts(args.ports);

let result = scan(hosts, ports);

// Because those socket.on calls are asynchronous, we need to
// wait until we get data back from those calls.
result.then((data) => {
	debug && console.log(data);
});