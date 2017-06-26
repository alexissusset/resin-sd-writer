/*jshint esversion: 6 */
/*
 * Soracom Demonstration NodeJS App
 *
 */
var figlet = require('figlet'),
	spawn = require('child_process').spawn,
	request = require('requestretry'),
	os = require('os-utils'),
	led = require('pi-pins').connect(4);

led.mode('out');
led.value(false);

// Setup base variables
var console_logging = 1,												// Set to 1 to see logs in console
	beam_interval = 22000,												// Time in miliseconds
	beam_endpoint = 'mqtt://beam.soracom.io:1883',						// Beam endpoint for MQTT messages
	beam_send_topic = 'imsi_out',
	beam_receive_topic,
	beam_mqtt_message_id = 1,
	iot_mqtt,
	beam_mqtt,
	blink,
	led_on;

// Get device's IMSI 
request({
	url: 'http://metadata.soracom.io/v1/subscriber.imsi',
	method: 'GET',
}, function(error, response){
	if(error) {
	    console.log('[DEV] couldnt make IMSI Metadata request with error: '+ error);
	} else if(response.hasOwnProperty('statusCode') && response.statusCode !== 200){
	    console.log('[DEV] couldnt make IMSI Metadata request with error: '+ error +' and status code: '+ response.statusCode);
	} else {
	    console.log('[DEV] successfully sent data to Soracom Harvest');
	    console.log('[DEV] Device IMSI is: '+ response.body);
	    // Set Beam MQTT topic to receive messages
	    beam_receive_topic = 'imsi_in/'+response.body.replace(/\n$/, '');
	}
});

// Setup MQTT
console.log('[DEV] Loading MQTT client');
var iot_mqtt = require('mqtt');
//var mqtt_options = {
//	username: 'beamuser',
//	password: 'passwd'
//};
beam_mqtt = iot_mqtt.connect(beam_endpoint); //, mqtt_options);
beam_mqtt.on('connect', function() {
	console.log('[DEV] Connected to Beam MQTT');
	if(beam_receive_topic){
		console.log('[DEV] Subscribe to MQTT topic: '+beam_receive_topic);
		beam_mqtt.subscribe(beam_receive_topic);
		beam_mqtt.on('message', (topic, message) => {  
			console.log('[DEV] Received MQTT message on topic: '+topic+' with message '+message);
			if(message == 'on'){
				console.log('[DEV] switching LED on');
				clearInterval(blink);
				led.value(true);
			}else if(message == 'off'){
				console.log('[DEV] switching LED off');
				clearInterval(blink);
				led.value(false);
			}else if(message == 'blink'){
				console.log('[DEV] switching LED blink mode');
				clearInterval(blink);
				blink = setInterval(function led_blink(){ 
					if(led_on){
						led.value(false);
						led_on = false;
					}else{
						led.value(true);
						led_on = true;
					}
				}, 500);
			}
		});
	}
});


// Display startup message
console.log();
console.log('              ..;;ttLLCCCCCCLLtt;;..              ');
console.log('          ..11CCCCCCCCCCCCCCCCCCCCCC11..          ');
console.log('        ::LLCCCCCCttii::,,::iittCCCCCCLL::        ');
console.log('      ::CCCCCC11..              ..11CCCCCC::      ');
console.log('    ::CCCCCCCCttii::..              ::LLCCCC::    ');
console.log('  ..LLCCCCCCCCCCCCCCCCffii::..        ,,LLCCLL..  ');
console.log('  11CCCC::,,;;ttLLCCCCCCCCCCCCff11::..  ::CCCC11  ');
console.log('..CCCC11          ,,;;11LLCCCCCCCCCCCC..  11CCCC..');
console.log('iiCCCC,,                  ..::11LLCCCC..  ,,CCCCii');
console.log('ttCCff                          ;;CCCC..    ffCCff');
console.log('LLCCii                          ;;CCCC..    iiCCLL');
console.log('CCCC;;                        ,,11CCCC..    ;;CCCC');
console.log('CCCC::                ,,iittLLCCCCCCCC..    ::CCCC');
console.log('CCCC;;      ..::iittCCCCCCCCCCCCCCffii      ;;CCCC');
console.log('LLCCii    ;;CCCCCCCCCCCCLLttii,,            iiCCLL');
console.log('ttCCff    ..LLCCCCtt;;,,          ::        ffCCff');
console.log('iiCCCC,,    iiCCCC,,          ,,::tt,,..  ,,CCCCii');
console.log('..CCCC11    ..LLCCtt          ;;LLCCtt..  11CCCC..');
console.log('  11CCCC::    iiCCCC,,          LLff;;  ::CCCC11  ');
console.log('  ..LLCCLL,,  ..LLCCtt  ..tt11..,,  ::,,LLCCLL..  ');
console.log('    ::CCCCLL::  iiCCCC::ffCCCC;;    ::LLCCCC::    ');
console.log('      ::CCCCCC11,,LLCCCCCCCC11  ..11CCCCCC::      ');
console.log('        ,,LLCCCCCCLLCCCCCCffiittCCCCCCLL::        ');
console.log('          ..11LLCCCCCCCCCCCCCCCCCCLL11..          ');
console.log('              ..;;ttLLCCCCCCLLtt;;..              ');
console.log(figlet.textSync('soracom', {
	horizontalLayout: 'default',
	verticalLayout: 'default'
}));
if (!console_logging) {
	console.log('CONSOLE_LOGGING variable not set, running in quite mode');
}

// App functions
setInterval(function rpi_stats() {
	// Gather device data
	var single_read_pi_temperature = spawn('/bin/cat', ['/sys/class/thermal/thermal_zone0/temp']);
	single_read_pi_temperature.stdout.on('data', function(data_temperature) {
		var rpi_stats_data = {
			message_id: beam_mqtt_message_id,
			pi_temperature: parseFloat(data_temperature) / 1000,
			pi_load: parseFloat(os.loadavg(5) * 100),
			pi_memory: parseFloat(os.freememPercentage() * 100),
		};
		// Increase message ID for next message
		beam_mqtt_message_id++;
		// if soracom_harvest_interval is set, post Pi stats to Soracom Harvest service
			console.log('[DEV] posting Beam message: ' + JSON.stringify(rpi_stats_data));
			console.log('Current pi stats:' + JSON.stringify(rpi_stats_data));
			// Post a message to MQTT topic
			if(iot_mqtt){
				console.log('[DEV] Posting data to Beam MQTT: '+ JSON.stringify(rpi_stats_data));
				beam_mqtt.publish(beam_send_topic, JSON.stringify(rpi_stats_data), function() {
					console.log('Successfully posted data to Beam MQTT');
				});
			}
	});
}, beam_interval);

// Listen to MQTT messages and act on them
if(beam_receive_topic){
	beam_mqtt.on('message', (topic, message) => {  
		console.log('[DEV] Received MQTT message on topic: '+topic+' with message '+message);
	});
}

// Real artists ship - Steve Jobs - http://c2.com/cgi/wiki?RealArtistsShip
