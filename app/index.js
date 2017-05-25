#!/bin/env node

{
    const supervisorClient = require(__dirname + '/libs/supervisorClient/supervisorClient.js');
    const imageDownloader = require(__dirname + '/libs/imageDownloader/imageDownloader.js');
    const guiType = (process.env.GUI_TYPE == null) ? "none" : process.env.GUI_TYPE;
    const gui = require(__dirname + '/libs/gui/' + guiType + '.js');
    const chalk = require('chalk');
    const Writer = require(__dirname + '/libs/writer.js');
    const debug = require('debug')('main');

	var fs = require('fs'),
		md5 = require('md5'),
		valid_image;

    gui.ready();
    
    if(process.env.ETCHER_IMAGE_URL && process.env.ETCHER_IMAGE_MD5){
		// Check if image has already been downloaded and check it against checksum
		if (fs.existsSync('/data/resin.img')) { 
			fs.readFile('/data/resin.img', function(err, buf) {
				var md5_data = md5(buf);
				if(md5_data == process.env.ETCHER_IMAGE_MD5){
					console.log('Exhisting image has been validated');
					valid_image = 1;
				}else{
					console.log('Exhisting image has failed validation, '+md5_data+' | '+process.env.ETCHER_IMAGE_MD5+', re-downloading');
				}
			});
		}

		if(!valid_image){
    		imageDownloader.download(process.env.ETCHER_IMAGE_URL);
			
			imageDownloader.on('start', () => {
			    "use strict";
				console.log('Starting image download: '+process.env.ETCHER_IMAGE_URL);
			    gui.downloadStart();
			});
			
			imageDownloader.on('error', () => {
			    "use strict";
			    console.log('Image download error');
			    gui.downloadError();
			});
			
			imageDownloader.on('complete', () => {
			    "use strict";
			    fs.readFile('/data/resin.img', function(err, buf) {
					var md5_data_download = md5(buf);
					console.log('Image download completed with MD5 Checksum: '+md5_data_download);
					gui.downloadComplete();
					const writer = Writer.start('/data/resin.img');
					writer.on('progress', (data) => {
					    debug(data);
					    progress(data);
					});
					
					writer.on('done', (data) => {
					    debug(data);
					    complete(data);
					});
					
					writer.on('error', (error) => {
					    console.error('Error!');
					    console.error(error);
					});
			    });
			});
		}else{
			gui.downloadComplete();
			const writer = Writer.start('/data/resin.img');
			writer.on('progress', (data) => {
			    debug(data);
			    progress(data);
			});
			
			writer.on('done', (data) => {
			    debug(data);
			    complete(data);
			});
			
			writer.on('error', (error) => {
			    console.error('Error!');
			    console.error(error);
			});
		}
		
		let progress = function(data) {
		    "use strict";
		    if (isWriting(data.state.type)) {
			    console.log('Writing to '+data.device+' is '+data.state.percentage+'% complete');
		        gui.write(identifyDevice(data.device),data.state.percentage);
		    } else {
		        gui.verify(identifyDevice(data.device),data.state.percentage);
		    }
		};
		
		let complete = function(data) {
		    "use strict";
		    gui.done(identifyDevice(data.device));
		};
		
		let identifyDevice = function(data) {
		    "use strict";
		    switch (data) {
		        case "/dev/sda":
		            return 4;
		        case "/dev/sdb":
		            return 3;
		        case "/dev/sdc":
		            return 2;
		        case "/dev/sdd":
		            return 1;
		        default:
		            return 5;
		
		    }
		};
		
		let isWriting = function(data) {
		    "use strict";
		    if (data === "write") {
		        console.log("Writing data");
		        return true;
		    } else {
		        return false;
		    }
		};
    }else{
	    if(!process.env.ETCHER_IMAGE_URL) console.log('[ERROR] Please set ETCHER_IMAGE_URL to use this application');
	    if(!process.env.ETCHER_IMAGE_MD5) console.log('[ERROR] Please set ETCHER_IMAGE_MD5 to use this application');
    }

}
