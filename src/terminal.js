// Here are the various arguments:
// 		--hosts 	To get the desired hosts to be scanned (required)
// 					Can get multiple hosts with a comma separator, or a range with a dash '-'
//
// 			ex:	--hosts=192.168.1.100
// 				--hosts=192.168.1.100,192.168.1.101,192.168.1.102
// 				--hosts=192.168.1.100-102
// 				--hosts=192.168.1.100,192.168.1.150-254
// 			Note: the dash only works in the final octet currently
//
// 		--ports 	To get the desired ports to be scanned (required)
// 					Can get multiple ports with a comma separator, or a range with a dash '-'
// 
// 			ex: --ports=22
// 				--ports=22,23,80
// 				--ports=22-80
// 				--ports=22,23,80,135-139
//
// 		--tcp=true|false 	To do a TCP port scan (default: true)
//
// 		--udp=true|false 	To do a UDP port scan (default: false)
//
// 		--icmp=true|false 	Does a ping to determine whether the host(s) are alive (default: false)
//
// 		--traceroute=true|false		Does a traceroute from the user's device to the host(s) (default: false)
// 			Note: This seems to only be producing reliable results on Linux machines currently.
// 				  Still looking for a solution.
//
// 		--timeout=<positive integer number>		Sets the timeout for the TCP scan. (default: 2000)
//
// 		--showClosedPorts=true|false	Determines whether to show closed ports in scan results (default: true)

// Only do this if running from terminal
exports.execute = function (commander, argv) {
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
    .parse(argv)

  // Parse hosts

  // Parse ports

  // Get timeout if available

  // tcp, udp, icmp, traceroute, show-closed-ports are all boolean checks

  // Do the scan!
}