'use strict';

const net = require('net');
const dgram = require('dgram');
const Q = require('q');
const ping = require('net-ping');

let debug = false;

// grab useful args and map them into an object
let getArgs = (argv) => {
	let usefulArgs = { tcp: 'true', timeout: 2000 };

	argv.slice(2).forEach((data) => {
		if (data.indexOf('--') !== -1) {
			let equals = data.indexOf('=');

			usefulArgs[data.slice(2, equals)] = data.slice(equals + 1);
		}
	});

	debug && console.log(usefulArgs);

	return usefulArgs;
};

let parseHosts = (hosts) => {
	debug && console.log(hosts);

	if(hosts.indexOf('-') !== -1) {
		return hosts.split(',').map((host) => {
			if (host.indexOf('-') !== -1) {
				let firstThree = host.split('.')[0] + '.' + host.split('.')[1] + '.' + host.split('.')[2];
				let interval = host.split('.')[3].split('-');
				let length = interval[1] - interval[0] + 1;

				return Array.from(Array(length).keys())
							.map(x => x + parseInt(interval[0]))
							.map(String)
							.map(x => firstThree + '.' + x);
			}
		}).reduce((first, second) => first.concat(second), []);
	}
	else return hosts.split(',');
};

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

// Scan the hosts and the ports.
let tcpScan = (host, port, timeout) => {
	let socket = net.createConnection(port, host);
	socket.setTimeout(timeout);

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

// The udp version of the scan. It is super simple, and probably doesn't
// work very well. But it is the best I could find.
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

// To determine if the machine is alive (not super reliable)
let icmpScan = (host) => {
	let deferred = Q.defer();
	let result = { host };

	const session = ping.createSession();

	session.pingHost(host, (err, host) => {
		result.alive = !err;
		deferred.resolve(result);
		session.close();
	});

	return deferred.promise;
};

let icmpTraceroute = (host) => {
	let deferred = Q.defer();
	let result = { host, type: 'traceroute', route: [] };
	let order = 0;

	const session = ping.createSession();

	session.traceRoute(host, 20, 
		(err, host, ttl, sent, rcvd) => {
			if (err instanceof ping.TimeExceededError) {
				result.route.push({ ip: err.source, order: ++order });
			}
		},
		(err, host) => {
			if (!err) deferred.resolve(result);
			else deferred.reject(result);
		});

	return deferred.promise;
};

let args = getArgs(process.argv);
let hosts = parseHosts(args.hosts);
let ports = parsePorts(args.ports);

let icmpScans = [];
let icmpTraceroutes = [];
let tcpScans = [];
let udpScans = [];

hosts.forEach((host) => {
	if (args.icmp === 'true') icmpScans.push(icmpScan(host));
});

Q.all(icmpScans).then((icmpScanResults) => {
	let aliveHosts = args.icmp === 'true' ? [] : hosts;

	icmpScanResults.forEach((scanResult) => {
		if (scanResult.alive) aliveHosts.push(scanResult.host);
	});

	// Gather scans
	aliveHosts.forEach((host) => {
		if (args.traceroute === 'true') icmpTraceroutes.push(icmpTraceroute(host));
	});

	aliveHosts.forEach((host) => {
		ports.forEach((port) => {
			if (args.tcp === 'true') tcpScans.push(tcpScan(host, port, parseInt(args.timeout)));
			if (args.udp === 'true') udpScans.push(udpScan(host, port));
		});
	});

	let allScans = tcpScans.concat(udpScans).concat(icmpTraceroutes);

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
			else if (result.type === 'traceroute') {
				console.log(result);
			}

			console.log(output);
		});
	});
});
