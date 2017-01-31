'use strict';

// Just found an example online for creating a "module" that can be used virtually everywhere.
// I suppose the only caveat might be in a 'use strict' env. Not sure though.
// There is a CommonJS version of this method, but it seems a bit unneceesary to me. I can always
// Change it if I must.
// Found at: https://github.com/umdjs/umd

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['net', 'dgram', 'q', 'net-ping'], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('q'), require('net-ping'), require('commander'))
  } else {
    root.returnExports = factory(root.net, root.dgram, root.q, root['net-ping'], root.commander)
  }
})(this, function (q, netPing, commander) {
  // I'm well aware that this implementation may not work with anything but node.js. I'll have to
  // Figure out how to make it work with AMD and a browser later.

  // TODO: also consider using RxJs instead of q.

  let debug = true

  commander
    .version('0.0.0-1')
    .usage('-H <hosts> -p <ports> [options]')
    .option('-H, --hosts <items>', 'To get the desired hosts to be scanned (required).')
    .option('-p, --ports <items>', 'To get the desired ports to be scanned (required).')
    .option('-t, --tcp', 'To do a TCP Port scan.')
    .option('-u, --udp', 'To do a UDP Port scan.')
    .option('-i, --icmp', 'Does a ping to determine if the hosts are alive.')
    .option('-r, --traceroute', 'Does a traceroute from the user\'s device to the host(s).')
    .option('-o, --timeout [value]', 'Sets the timeout for the TCP scan (in milliseconds).')
    .option('-s, --show-closed-ports', 'To show closed ports in results.')
    .parse(process.argv)

  return {}
})

/////////////////////////// OLD CODE

// const net = require('net');
// const dgram = require('dgram');
// const Q = require('q');
// const ping = require('net-ping');

// let debug = false;
   
// // TODO:	--help for info
// //			Also, make sure that when something weird happens in the arguments, it shows --help

// // grab useful args and map them into an object
// // There are plenty of useful npm packages that help out with this, I will switch to one of those
// // when I get a chance.

// // Here are the various arguments:
// // 		--hosts 	To get the desired hosts to be scanned (required)
// // 					Can get multiple hosts with a comma separator, or a range with a dash '-'
// //
// // 			ex:	--hosts=192.168.1.100
// // 				--hosts=192.168.1.100,192.168.1.101,192.168.1.102
// // 				--hosts=192.168.1.100-102
// // 				--hosts=192.168.1.100,192.168.1.150-254
// // 			Note: the dash only works in the final octet currently
// //
// // 		--ports 	To get the desired ports to be scanned (required)
// // 					Can get multiple ports with a comma separator, or a range with a dash '-'
// // 
// // 			ex: --ports=22
// // 				--ports=22,23,80
// // 				--ports=22-80
// // 				--ports=22,23,80,135-139
// //
// // 		--tcp=true|false 	To do a TCP port scan (default: true)
// //
// // 		--udp=true|false 	To do a UDP port scan (default: false)
// //
// // 		--icmp=true|false 	Does a ping to determine whether the host(s) are alive (default: false)
// //
// // 		--traceroute=true|false		Does a traceroute from the user's device to the host(s) (default: false)
// // 			Note: This seems to only be producing reliable results on Linux machines currently.
// // 				  Still looking for a solution.
// //
// // 		--timeout=<positive integer number>		Sets the timeout for the TCP scan. (default: 2000)
// //
// // 		--showClosedPorts=true|false	Determines whether to show closed ports in scan results (default: true)
// let getArgs = argv => {
//   let usefulArgs = { tcp: 'true', timeout: 2000, showClosedPorts: 'true' };

//   argv.slice(2).forEach(data => {
//     if (data.indexOf('--') !== -1) {
//       let equals = data.indexOf('=');

//       usefulArgs[data.slice(2, equals)] = data.slice(equals + 1);
//     }
//   });

//   debug && console.log(usefulArgs);

//   return usefulArgs;
// };

// // Doesn't currently allow for subnets. I'll probably make the subnet super simple
// // and just allow /24 right now.

// // Parses the hosts by either a comma (192.168.1.2,192.168.1.4) or a dash (192.168.1.2-254)
// // Combining them works too (192.168.1.2,192.168.1.100-254)
// let parseHosts = hosts => {
//   debug && console.log(hosts);

//   if(hosts.indexOf('-') !== -1) {
//     return hosts.split(',').map(host => {
//       if (host.indexOf('-') !== -1) {
//         let firstThree = host.split('.')[0] + '.' + host.split('.')[1] + '.' + host.split('.')[2];
//         let interval = host.split('.')[3].split('-');
//         let length = interval[1] - interval[0] + 1;

//         return Array.from(Array(length).keys())
//               .map(x => x + parseInt(interval[0]))
//               .map(String)
//               .map(x => firstThree + '.' + x);
//       }
//     }).reduce((first, second) => first.concat(second), []);
//   }
//   else return hosts.split(',');
// };

// // Am I missing anything? Also, a regex probably could have caught everything, but I really
// // didn't want to mess with that.

// // Just like parsing the hosts, this parses either by comma (22,23,80) or by dash (1-1000)
// // and you can combine them (22,23,80,135-139,443)
// let parsePorts = ports => {
//   debug && console.log(ports);

//   if (ports.indexOf('-') !== -1) {
//     return ports.split(',').map(port => {
//       if (port.indexOf('-') !== -1) {
//         let interval = port.split('-');
//         let length = interval[1] - interval[0] + 1;

//         return Array.from(Array(length).keys())
//               .map(x => x + parseInt(interval[0])).map(String);
//       }
//       return port;
//     }).reduce((first, second) => first.concat(second), []);
//   }
//   else return ports.split(',');
// };

// // TCP Scan the hosts and the ports.
// let tcpScan = (host, port, timeout) => {
//   let socket = net.createConnection(port, host);
//   socket.setTimeout(timeout);

//   let result = { host, port, type: 'TCP' };

//   let deferred = Q.defer();

//   // Create callback functions for each possible result.
//   socket.on('error', err => {
//     result.status = {};

//     if (err.message.indexOf('ECONNREFUSED') !== -1) {
//       result.status.state = 'closed';
//       result.status.reason = 'connection refused';
//     }
//     else if (err.message.indexOf('EHOSTUNREACH') !== -1) {
//       result.status.state = 'closed';
//       result.status.reason = 'host unreachable';
//     }
//     else
//       result.status.state = err.message;

//     debug && console.log('error');
//   });
//   socket.on('timeout', () => {
//     result.status = {};

//     if (result.isOpen) result.status.state = 'open';
//     else {
//       result.status.state = 'closed';
//       result.status.reason = 'connection timed out';
//     }

//     debug && console.log('timeout');

//     socket.destroy();
//   });
//   socket.on('connect', () => {
//     result.isOpen = true;
//     debug && console.log('connect');
//   });
//   socket.on('data', data => {
//     // This might be useful later to get port service information
//     result.receivedData = true;

//     debug && console.log('data');

//     socket.destroy();
//   });
//   socket.on('close', () => {
//     if (!result.receivedData && result.isOpen) {
//       result.status = {};
//       result.isOpen = false;
//       result.status.state = 'open';
//       result.status.reason = 'no data received';
//     }

//     socket.destroy();

//     debug && console.log('close');

//     // It appears that 'close' is always called at the end, so
//     // I feel that putting the deferred.resolve here is probably
//     // sufficient.
//     deferred.resolve(result);
//   });

//   return deferred.promise;
// };

// // The udp version of the scan. It is super simple, and probably doesn't
// // work very well. But it is the best I could find. Node.js doesn't really
// // have any other tools available.
// let udpScan = (host, port) => {
//   const buffer = new Buffer('Some bytes');
//   const socket = dgram.createSocket('udp4');

//   let deferred = Q.defer();
//   let result = { host, port, type: 'UDP' };

//   socket.send(buffer, 0, buffer.length, port, host, err => {
//     result.data = err;
//     deferred.resolve(result);
//     socket.close();
//   });

//   return deferred.promise;
// }

// // To determine if the machine is alive (not super reliable, but definitely better than nothing)
// // Only runs if the icmp flag is true. Essentially, a ping.
// let icmpScan = host => {
//   let deferred = Q.defer();
//   let result = { host };

//   const session = ping.createSession();

//   session.pingHost(host, (err, host) => {
//     result.alive = !err;
//     deferred.resolve(result);
//     session.close();
//   });

//   return deferred.promise;
// };

// // Does a traceroute. Unsure how reliable this is, but it seems to be working.
// // Apparently it doesn't work when trying this from a Windows machine. It works
// // just fine from a Linux machine though.

// // Eventually will write flags to allow the user to change the various flags possible
// // with traceroute (timeout, maxHopTimeouts, ttl...)
// let icmpTraceroute = host => {
//   let deferred = Q.defer();
//   let result = { host, type: 'traceroute', route: [] };
//   let order = 0;

//   const session = ping.createSession({
//     retries: 1,
//     timeout: 2000
//   });

//   session.traceRoute(host, { ttl: 10, maxHopTimeouts: 10 }, 
//     (err, host, ttl, sent, rcvd) => {
//       let route = { order: ++order };
//       route.ip = err ? err instanceof ping.TimeExceededError ? err.source : err.message : host;
//       result.route.push(route);
//     },
//     (err, host) => {
//       deferred.resolve(result);
//     });

//   return deferred.promise;
// };

// // This is where we get the arguments and parse the hosts and ports.

// console.log('Please see the comments in the code to see how the arguments work.');

// let args = getArgs(process.argv);
// let hosts = parseHosts(args.hosts);
// let ports = parsePorts(args.ports);

// let icmpScans = [];
// let icmpTraceroutes = [];
// let tcpScans = [];
// let udpScans = [];

// // This is where the scanning begins.
// hosts.forEach(host => {
//   if (args.icmp === 'true') icmpScans.push(icmpScan(host));
// });

// // Q is necessary because these scans are asynchronous. In order to get the data
// // back in a nice, orderly manner is to use an asynchronous library like Q. If you've
// // had a hard time with asynchronous stuff, or are just interested in learning about it,
// // I highly recommend looking into Q. There are other great libraries out there, but Q
// // is the only one I've learned so far, and I've really like it.

// // A lightweight, built in version of Q is available for AngularJS, called $q.
// Q.all(icmpScans).then(icmpScanResults => {
//   let aliveHosts = args.icmp === 'true' ? [] : hosts;

//   icmpScanResults.forEach(scanResult => {
//     if (scanResult.alive) aliveHosts.push(scanResult.host);
//   });

//   // Gather traceroute, TCP, and UDP scans
//   aliveHosts.forEach(host => {
//     if (args.traceroute === 'true') icmpTraceroutes.push(icmpTraceroute(host));
//   });

//   aliveHosts.forEach(host => {
//     ports.forEach(port => {
//       if (args.tcp === 'true') tcpScans.push(tcpScan(host, port, parseInt(args.timeout)));
//       if (args.udp === 'true') udpScans.push(udpScan(host, port));
//     });
//   });

//   // Put all the scans together in a single array.
//   let allScans = tcpScans.concat(udpScans).concat(icmpTraceroutes);

//   // Print out the results
//   Q.all(allScans).then(results => {
//     debug && console.log(results);

//     results.sort((a, b) => a.host.split('.')[3] - b.host.split('.')[3])
//     .forEach(result => {
//       // I know that this is messy. I'll be sure to clean this up later.
//       if (args.showClosedPorts === 'true' ||
//         (result.type === 'TCP' && result.isOpen || result.status.state === 'open') ||
//         (result.type === 'UDP' && !(result.data || result.data === 0))) {
//         let output = '';

//         if (result.type !== 'traceroute') {
//           output = result.host + ':' + result.port + '\t' + result.type + '\t';

//           if (result.type === 'TCP') {
//             if (result.isOpen) output += 'open';
//             else if (result.status) output += result.status.state + ' (' + result.status.reason + ')';
//           }
//           else if (result.type === 'UDP') {
//             if (result.data || result.data === 0) output += 'closed';
//             else output += 'maybe open (no data or error received)';
//           }
//         }
//         else if (result.type === 'traceroute') {
//           output = 'traceroute: ' + result.host + '\n';

//           result.route.sort((first, second) => first.order - second.order)
//                 .forEach(route => output += route.order.toString() + ' ' + route.ip + '\n');
//         }

//         console.log(output);
//       }
//     });
//   });
// });
