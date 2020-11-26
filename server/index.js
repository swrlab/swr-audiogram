// Dependencies
var express = require('express'),
	compression = require('compression'),
	path = require('path'),
	multer = require('multer'),
	uuid = require('uuid'),
	mkdirp = require('mkdirp'),
	package = require('../package.json');

// Routes and middleware
var logger = require('../lib/logger/'),
	render = require('./render.js'),
	status = require('./status.js'),
	fonts = require('./fonts.js'),
	errorHandlers = require('./error.js');

// Settings
var serverSettings = require('../lib/settings/');
var app = express();

logger.log('Starting audiogram');
app.use(compression());
// app.use(logger.morgan());

// middleware for pre-processing
app.use(function (req, res, next) {
	// upgrade http requests to https
	if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] == 'http') {
		return res.redirect(301, 'https://' + req.headers['host'] + req.url);
	}

	// enable HSTS header if not local
	//process.env.STAGE != 'dev' ? res.set('Strict-Transport-Security', 'max-age=31557600') : null;

	// adding basic XSS and other security features
	res.set('X-Content-Type-Options', 'nosniff');
	res.set('X-Frame-Options', 'SAMEORIGIN');
	res.set('X-XSS-Protection', '1');

	// build and updateservice name
	res.set('swr-service', 'swr-audiogram');

	// insert version number
	res.set('swr-version', package.version);

	// log request
	process.env.STAGE == 'dev' ? console.log(req.method, req.originalUrl) : null;

	// continue with normal pipeline
	next();
});

// Options for where to store uploaded audio and max size
var fileOptions = {
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			let uid = uuid.v1();
			let dir = path.join(serverSettings.workingDirectory, uid);
			file.uid = uid;

			mkdirp(dir, function (err) {
				return cb(err, dir);
			});
		},
		filename: function (req, file, cb) {
			cb(null, file.fieldname);
		},
	}),
};

var imageOptions = {
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			let dir = path.join(serverSettings.workingDirectory, 'background');

			mkdirp(dir, function (err) {
				return cb(err, dir);
			});
		},
		filename: function (req, file, cb) {
			let uid = uuid.v1();
			file.uid = uid;

			cb(null, uid);
		},
	}),
};

if (serverSettings.maxUploadSize) {
	fileOptions.limits = {
		fileSize: +serverSettings.maxUploadSize,
	};
}

// On submission, check upload, validate input, and start generating a video
app.post('/submit/', [multer(fileOptions).single('audio'), render.validate, render.route]);

// If not using S3, serve videos locally
if (!serverSettings.s3Bucket) {
	app.use('/video/', express.static(path.join(serverSettings.storagePath, 'video')));
}

// Serve custom fonts
app.get('/fonts/fonts.css', fonts.css);
app.get('/fonts/fonts.js', fonts.js);

if (serverSettings.fonts) {
	app.get('/fonts/:font', fonts.font);
}

// Check the status of a current video
app.get('/status/:id/', status);

// Serve background images and themes JSON statically
app.use(
	'/settings/',
	function (req, res, next) {
		console.log(path.join(__dirname, '..', 'settings'));

		// Limit to themes.json and bg images
		if (req.url.match(/^\/?themes.json$/i) || req.url.match(/^\/?backgrounds\/[^/]+$/i)) {
			return next();
		}

		return res.status(404).send('Cannot GET > ' + path.join('/settings', req.url));
	},
	express.static(path.join(__dirname, '..', 'settings'))
);

// handle background get/posts
app.get('/background/:filename', (req, res) => {
	var options = {
		root: path.join(__dirname, '..', 'tmp', 'background'),
		dotfiles: 'deny',
		headers: {
			'x-timestamp': Date.now(),
			'x-sent': true,
		},
	};

	res.sendFile(req.params.filename, options);
});
app.post('/background/', multer(imageOptions).single('image'), (req, res) => {
	res.send(req.file.uid);
});

// Serve static editor files
app.use('/', express.static(path.join(__dirname, '..', 'editor')));

app.use(errorHandlers);

module.exports = app;
