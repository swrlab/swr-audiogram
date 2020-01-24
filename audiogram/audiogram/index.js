var path = require("path"),
    queue = require("d3").queue,
    mkdirp = require("mkdirp"),
    rimraf = require("rimraf"),
    serverSettings = require("../lib/settings/"),
    transports = require("../lib/transports/"),
    logger = require("../lib/logger/"),
    Profiler = require("../lib/profiler.js"),
    probe = require("../lib/probe.js"),
    getWaveform = require("./waveform.js"),
    initializeCanvas = require("./initialize-canvas.js"),
    drawFrames = require("./draw-frames.js"),
    combineFrames = require("./combine-frames.js"),
    trimAudio = require("./trim.js"),
    request = require('request');

function Audiogram(id) {

  // Unique audiogram ID
  this.id = id;

  // File locations to use
  this.dir = path.join(serverSettings.workingDirectory, this.id);

  this.audioPath = path.join(this.dir, "audio");
  this.videoPath = path.join(this.dir, "video.mp4");
  this.frameDir = path.join(this.dir, "frames");

  this.profiler = new Profiler();

  return this;

}

// Get the waveform data from the audio file, split into frames
Audiogram.prototype.getWaveform = function(cb) {

  var self = this;

  this.status("probing");

  probe(this.audioPath, function(err, data){

    if (err) {
      return cb(err);
    }

    if (self.settings.theme.maxDuration && self.settings.theme.maxDuration < data.duration) {
      return cb("Exceeds max duration of " + self.settings.theme.maxDuration + "s");
    }

    self.profiler.size(data.duration);
    self.set("numFrames", self.numFrames = Math.floor(data.duration * self.settings.theme.framesPerSecond));
    self.status("waveform");

    getWaveform(self.audioPath, {
      numFrames: self.numFrames,
      samplesPerFrame: self.settings.theme.samplesPerFrame,
      channels: data.channels
    }, function(waveformErr, waveform){

      return cb(waveformErr, self.waveform = waveform);

    });


  });

};

// Trim the audio by the start and end time specified
Audiogram.prototype.trimAudio = function(start, end, cb) {

  var self = this;

  this.status("trim");

  // FFmpeg needs an extension to sniff
  var trimmedPath = this.audioPath + "-trimmed.mp3";

  trimAudio({
    origin: this.audioPath,
    destination: trimmedPath,
    startTime: start,
    endTime: end
  }, function(err){
    if (err) {
      return cb(err);
    }

    self.audioPath = trimmedPath;

    return cb(null);
  });

};

// Initialize the canvas and draw all the frames
Audiogram.prototype.drawFrames = function(cb) {

  var self = this;

  this.status("renderer");

  initializeCanvas(this.settings.theme, function(err, renderer){

    if (err) {
      return cb(err);
    }

    self.status("frames");

    drawFrames(renderer, {
      width: self.settings.theme.width,
      height: self.settings.theme.height,
      numFrames: self.numFrames,
      frameDir: self.frameDir,
      caption: self.settings.caption,
      waveform: self.waveform,
      tick: function() {
        transports.incrementField(self.id, "framesComplete");
      }
    }, cb);

  });

};

// Combine the frames and audio into the final video with FFmpeg
Audiogram.prototype.combineFrames = function(cb) {

  this.status("combine");

  combineFrames({
    framePath: path.join(this.frameDir, "%06d.png"),
    audioPath: this.audioPath,
    videoPath: this.videoPath,
    framesPerSecond: this.settings.theme.framesPerSecond
  }, cb);

};

// Master render function, queue up steps in order
Audiogram.prototype.render = function(cb) {

  var self = this,
      q = queue(1);

  this.status("audio-download");

  // Set up tmp directory
  q.defer(mkdirp, this.frameDir);

  // Download the stored audio file
  q.defer(transports.downloadAudio, "audio/" + this.id, this.audioPath);

  // If the audio needs to be clipped, clip it first and update the path
  if (this.settings.start || this.settings.end) {
    q.defer(this.trimAudio.bind(this), this.settings.start || 0, this.settings.end || null);
  }

  // Get the audio waveform data
  q.defer(this.getWaveform.bind(this));

  // Draw all the frames
  q.defer(this.drawFrames.bind(this));

  // Combine audio and frames together with ffmpeg
  q.defer(this.combineFrames.bind(this));

  // Upload video to S3 or move to local storage
  q.defer(transports.uploadVideo, this.videoPath, "video/" + this.id + ".mp4");

  // Delete working directory
  q.defer(rimraf, this.dir);

  // Final callback, results in a URL where the finished video is accessible
  q.await(function(err){
	  var jsonArray = { "@context": "http://schema.org/extensions", "@type": "MessageCard", "themeColor": "#fff", "title": "Neues Audiogram gerendert / " + self.settings.theme.backgroundImage, "text": self.settings.theme.width + "x" + self.settings.theme.height + " /// " + self.id, "potentialAction": [ { "@type": "OpenUri", "name": "Video öffnen", "targets": [ { "os": "default", "uri": "https://lab.swr.de/audio/video/" + self.id + ".mp4" } ] } ] };

	var options = {
	  uri: 'https://outlook.office.com/webhook/c17d1372-d0ae-4c79-bb8e-5a3990f64d54@bcca095d-88d4-42f8-8260-cc216b81f62d/IncomingWebhook/5e4731d34ae84218a51dbfcc2579d105/1e3c506a-2808-4701-b1d2-2919214a8fea',
	  method: 'POST',
	  json: jsonArray
	};

// 		console.log(jsonArray);
				
		request(options, function (error, response, body) {
// 		    console.log(body);
	        if (!error && response.statusCode == 200) {
	            console.log("Rendering erfolgreich: https://lab.swr.de/audio/video/" + self.id + ".mp4" );
	        } else {
		        console.log(error);
	        }
    	}
);
		

    if (!err) {
      self.set("url", transports.getURL(self.id));
    }

    logger.debug(self.profiler.print());

    return cb(err);

  });

  return this;

};

Audiogram.prototype.set = function(field, value) {
  logger.debug(field + "=" + value);
  transports.setField(this.id, field, value);
  return this;
};

// Convenience method for .set("status")
Audiogram.prototype.status = function(value) {
  this.profiler.start(value);
  return this.set("status", value);
};

module.exports = Audiogram;
