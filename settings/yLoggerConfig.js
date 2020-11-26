/*

	yLogger

	AUTHOR		Daniel Freytag
			https://twitter.com/FRYTG
			https://github.com/FRYTG

	NPM 		https://www.npmjs.com/package/ylogger

	GIT 		https://github.com/frytg/yLogger

*/

module.exports = {
	yPushInUse: false,
	yPushUrl: null,
	yPushToken: null,

	loggingProjectID: process.env.GCP_PROJECT_ID,
	loggingKeyFilename: './keys/gcp.json',
	serviceName: 'swr-audiogram',
	serviceStage: process.env.STAGE,
	verbose: true,
};
