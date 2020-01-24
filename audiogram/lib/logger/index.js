var winston = require("winston"),
    morgan = require("morgan");

winston.setLevels({ error: 0, info: 1, debug: 2, web: 3 });

winston.level = process.env.DEBUG ? "debug" : "info";


const os = require('os');
var stageFolder = "nostage";
var projectName = "audiogram-" + os.hostname() + "-" + stageFolder;

// Load Google Cloud Logging
const {Logging} = require('@google-cloud/logging');
const cloudLogging = new Logging({ projectId: "swr-lab", keyFilename: "/web_secret/SWR-Lab-d5d199e0f27f.json" });
const cloudLog = cloudLogging.log(projectName);


/*
// Load Google Cloud Error Reporting
const ErrorReporting = require('@google-cloud/error-reporting').ErrorReporting;
const errors = new ErrorReporting({ projectId: 'swr-lab', keyFilename: "/web_secret/SWR-Lab-d5d199e0f27f.json", ignoreEnvironmentCheck: true });
*/


function removeNonWord(str){
  return str.replace(/[^0-9a-zA-Z\xC0-\xFF \-]/g, '');
}

function lowerCase(str){
  return str.toLowerCase();
}

function upperCase(str){
  return str.toUpperCase();
}

function camelCase(str){
  str = removeNonWord(str)
      .replace(/\-/g, ' ') //convert all hyphens to spaces
      .replace(/\s[a-z]/g, upperCase) //convert first char of each word to UPPERCASE
      .replace(/\s+/g, '') //remove spaces
      .replace(/^[A-Z]/g, lowerCase); //convert first char to lowercase
  return str;
}



function logger(level, label, text, data) {

	 
	const entry = cloudLog.entry({resource: {type: "global", labels: {device: __dirname } } }, {message: projectName + ":" + label + "/ " + text, serviceContext: {service: label}, data: data, task: label});
	
	if(level == "error") { cloudLog.error(entry).then(() => { console.error(`Logged: ${text}`); }).catch(err => { console.error('Log ERROR:', err); });
	} else if (level == "info") { cloudLog.info(entry).then(() => { console.info(`Logged: ${text}`); }).catch(err => { console.error('Log ERROR:', err); });
	} else if (level == "critical") { cloudLog.critical(entry).then(() => { console.error(`Logged: ${text}`); }).catch(err => { console.error('Log ERROR:', err); });
	} else if (level == "warning") { cloudLog.warning(entry).then(() => { console.warn(`Logged: ${text}`); }).catch(err => { console.error('Log ERROR:', err); });
	} else if (level == "debug") { cloudLog.debug(entry).then(() => { console.log(`Logged: ${text}`); }).catch(err => { console.error('Log ERROR:', err); });
	} else { cloudLog.write(entry).then(() => { console.log(`Logged: ${text}`); }).catch(err => { console.error('Log ERROR:', err); }); }
	
	if(level == "critical" || level == "error") {
		
		var message = "";
		for(key in data) {
			if(typeof (data[key]) == "object") {
				
				if(typeof (data[key]) == "object") {
					for(key2 in data[key]) { message += "at " + key + "." + key2 + "(" + JSON.stringify(data[key][key2]) + ")\n"; }
				} else { message += "at " + key + "(" + data[key] + ")\n"; }
				
			} else { message += "at " + key + "(" + data[key] + ")\n"; }
		}
		
		const errorEvent = errors.event();
		errorEvent.setServiceContext(os.hostname() + "-" + label, stageFolder);
		errorEvent.setMessage(camelCase(os.hostname() + " " + label + " " + text) + ": " + text + "\n" + message);
		errorEvent.setUser(level + "@" + os.hostname()) + "-" + stageFolder;
		errorEvent.setFunctionName(label + "/" + camelCase(text));
		errors.report(errorEvent, () => {
		  console.log('Opened new Issue in Google Cloud Error Reporting!');
		});
	}
}





function log(msg, level) {

  if (!level) {
    level = "info";
  }

  // TODO Add timestamp

  winston.log(level, msg);
  logger(level, "sys", msg, {});

}

function debug(msg) {

  log(msg, "debug");

}

var stream = {
  write: function(msg) {
    log(msg, "web");
  }
};

module.exports = {
  log: log,
  debug: debug,
  morgan: function() {
    return morgan("combined", { "stream": stream });
  }
};
