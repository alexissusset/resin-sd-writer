const Writer = require(__dirname + '/libs/writer.js');

var fs = require('fs'),
	url = require('url'),
	https = require('https'),
	md5File = require('md5-file'),
	data_progress = [],
	download_retry;

function bytesToSize(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes == 0) return '0 Byte';
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   if(sizes[i] == 'GB'){
   	return Math.round(bytes * 100 / Math.pow(1024, i), 2) / 100 + ' ' + sizes[i];
   }else{
	return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];   
   }
}

function image_md5(message){
	if(message == 1){
		console.log('Starting OS image MD5 checksum');
		// Check downloaded image MD5 against configuration
		md5File('/data/resin.img', (err, hash) => {
			if(err) throw err
			if(hash == process.env.ETCHER_IMAGE_MD5){
				console.log('MD5 checksum verified successfully, start SD Writer software');
				// Download completed and validted, starting SD Writer software
				start_sd_writer(1);
		  }else{
				console.log('Invalid MD5 checksum: '+ hash +' re-downloading image');
				if(!download_retry){
					download_retry = 1;
					download(process.env.ETCHER_IMAGE_URL, '/data/resin.img', image_md5);	  
				}else{
					console.log('Too many download retries, stopping here');
					// Wait forever
					setInterval(() => {
						console.log('Plesae fix ETCHER_IMAGE_MD5 variable or image download location before restarting your pi');
					}, 50000);
				}
		  }
		});
	}else if(message){
		console.log('Download failed with error: '+ message +", restarting");
		if(!download_retry){
			download_retry = 1;
			download(process.env.ETCHER_IMAGE_URL, '/data/resin.img', image_md5);	  
		}else{
			console.log('Too many download retries, stopping here');
			// Wait forever
			setInterval(() => {
				console.log('Plesae fix ETCHER_IMAGE_MD5 variable or image download location before restarting your pi');
			}, 50000);
		}
	}
}

function start_sd_writer(){
	"use strict";
	const writer = Writer.start('/data/resin.img');
	writer.on('progress', (data) => {
	    progress(data);
	});
	
	writer.on('done', (data) => {
	    complete(data);
	});
	
	writer.on('error', (error) => {
	    console.error('Error!');
	    console.error(error);
	});
	
	let progress = function(data) {
	    "use strict";
	    if (isWriting(data.state.type)) {
			if(parseInt(data.state.percentage, 0) !== data_progress[data.device]) console.log('Writing to '+data.device+' is '+ parseInt(data.state.percentage, 0) +'% complete');
			data_progress[data.device] = parseInt(data.state.percentage, 0);
	    }
	};
	
	let complete = function(data) {
	    "use strict";
	    console.log('Completed write and check of image on: '+data.device);
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
	}
}

function download(fileUrl, apiPath, callback) {
	"use strict";
	console.log('Starting OS image download');
    var p = url.parse(fileUrl),           
        timeout = 10000,
        current_download_progress,
        previous_download_progress;
    
    var file = fs.createWriteStream(apiPath);
    
    var timeout_wrapper = function( req ) {
        return function() {
            console.log('abort');
            req.abort();
            callback("File transfer timeout!");
        };
    };

    var request = https.get(fileUrl).on('response', function(res) {          
        var len = parseInt(res.headers['content-length'], 10);
        var downloaded = 0;
        
        res.on('data', function(chunk) {
            file.write(chunk);
            downloaded += chunk.length;
            current_download_progress = (100.0 * downloaded / len).toFixed(0);
            if(current_download_progress > previous_download_progress){
				console.log("Downloaded " + current_download_progress + "% " + bytesToSize(downloaded));
            }
            previous_download_progress = current_download_progress;
            // reset timeout
            clearTimeout( timeoutId );
            timeoutId = setTimeout( fn, timeout );
        }).on('end', function () {
            // clear timeout
            clearTimeout( timeoutId );
            file.end();
            console.log('Image successfully downloaded to: ' + apiPath);
            callback(1);
        }).on('error', function (err) {
            // clear timeout
            clearTimeout(timeoutId);
            callback(err.message);
        });           
    });
    
    // generate timeout handler
    var fn = timeout_wrapper( request );

    // set initial timeout
    var timeoutId = setTimeout( fn, timeout );
}

if(process.env.ETCHER_IMAGE_URL && process.env.ETCHER_IMAGE_MD5){
	// Check if image has already been downloaded and check it against checksum
	if (!fs.existsSync('/data/resin.img') || (fs.existsSync('/data/resin.img') && process.env.ETCHER_IMAGE_OVERWRITE)){
		download(process.env.ETCHER_IMAGE_URL, '/data/resin.img', image_md5);
	}else{
		image_md5(1);
	}
}else{
    if(!process.env.ETCHER_IMAGE_URL) console.log('[ERROR] Please set ETCHER_IMAGE_URL environment variable to use this application');
    if(!process.env.ETCHER_IMAGE_MD5) console.log('[ERROR] Please set ETCHER_IMAGE_MD5 environment variable to use this application');
}