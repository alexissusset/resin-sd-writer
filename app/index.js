#!/bin/env node
{
    const supervisorClient = require(__dirname + '/libs/supervisorClient/supervisorClient.js');
    const imageDownloader = require(__dirname + '/libs/imageDownloader/imageDownloader.js');
    const guiType = "none";
    const gui = require(__dirname + '/libs/gui/none.js');
    const chalk = require('chalk');
    const Writer = require(__dirname + '/libs/writer.js');
    const debug = require('debug')('main');

	var fs = require('fs'),
		curl = require('download'),
		data_progress = [];

	function start_sd_writer() {
			"use strict";
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
				if(parseInt(data.state.percentage, 0) !== data_progress[data.device]) console.log('Writing to '+data.device+' is '+ parseInt(data.state.percentage, 0) +'% complete');
				data_progress[data.device] = parseInt(data.state.percentage, 0);
		        gui.write(identifyDevice(data.device),data.state.percentage);
		    } else {
		        gui.verify(identifyDevice(data.device),data.state.percentage);
		    }
		};
		
		let complete = function(data) {
		    "use strict";
		    console.log('Completed write and check of image on: '+data.device);
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
		        return true;
		    } else {
		        return false;
		    }
		};
	}

    gui.ready();
    
    if(process.env.ETCHER_IMAGE_URL){
		// Check if image has already been downloaded and check it against checksum
		if (!fs.existsSync('/data/resin.img') || (fs.existsSync('/data/resin.img') && process.env.ETCHER_IMAGE_OVERWRITE)){
			var imageDownloader = new curl(
				process.env.ETCHER_IMAGE_URL,
				'/data/resin.img'
			);
			
			imageDownloader.on('progress', (progress) => {
				"use strict";
				console.log($progress + "%");
				return;
			});
			
			imageDownloader.on('end', (code) => {
				"use strict";
				if(code == 0) {
					console.log('Image download completed, starting image downloader');
					gui.downloadComplete();
					start_sd_writer();
				}else{
					console.log('Image download error');
					gui.downloadError();
				}
			});
			
			// start download
			console.log('Starting image download: '+process.env.ETCHER_IMAGE_URL);
			gui.downloadStart();
			imageDownloader.start();
		}else{
			start_sd_writer();
		}
    }else{
	    console.log('[ERROR] Please set ETCHER_IMAGE_URL to use this application');
    }