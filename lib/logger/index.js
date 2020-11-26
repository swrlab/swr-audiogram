var winston = require('winston'),
	morgan = require('morgan');

winston.setLevels({ error: 0, info: 1, debug: 2, web: 3 });

winston.level = process.env.DEBUG ? 'debug' : 'info';

// load  yLogger
const yLoggerConfig = require('../../settings/yLoggerConfig');
const yLogger = require('ylogger');
const logger = new yLogger(yLoggerConfig).log;

function log(msg, level, obj) {
	if (!level) {
		level = 'info';
	}

	winston.log(level, msg);
	logger(level, 'renderer', msg, {...obj});
}

function debug(msg, obj) {
	log(msg, 'debug', obj);
}

var stream = {
	write: function (msg) {
		log(msg, 'web');
	},
};

module.exports = {
	log: log,
	debug: debug,
	morgan: function () {
		return morgan('combined', { stream: stream });
	},
};
