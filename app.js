'use strict';

const TOKEN_ENDPOINT       = 'https://accounts.artik.cloud/token',
	  ARTIK_CLOUD_ENDPOINT = 'https://api.artik.cloud/v1.1';

var get      = require('lodash.get'),
	async    = require('async'),
	request  = require('request'),
	platform = require('./platform'),
	isEmpty  = require('lodash.isempty'),
	config;

let syncDevices = function (devices, callback) {
	async.waterfall([
		async.constant(devices),
		async.asyncify(JSON.parse),
		(obj, done) => {
			done(null, get(obj, 'data.devices'));
		},
		(devicesArr, done) => {
			if (isEmpty(devicesArr)) return done(null, 0);

			async.each(devicesArr, (device, cb) => {
				platform.syncDevice(device, cb);
			}, (error) => {
				done(error, devicesArr.length);
			});
		}
	], callback);
};

/**
 * Emitted when the platform issues a sync request. Means that the device integration should fetch updates from the
 * 3rd party service.
 */
platform.on('sync', function () {
	async.waterfall([
		(done) => {
			request.post({
				url: TOKEN_ENDPOINT,
				headers: {
					'content-type': 'application/x-www-form-urlencoded'
				},
				form: {
					grant_type: 'client_credentials'
				},
				auth: {
					user: config.client_id,
					pass: config.client_secret
				}
			}, (error, response, body) => {
				if (error)
					done(error);
				else if (body.error || response.statusCode !== 200)
					done(new Error(body.error));
				else
					done(null, body);
			});
		},
		(tokenResponse, done) => {
			async.waterfall([
				async.constant(tokenResponse),
				async.asyncify(JSON.parse)
			], (parseError, obj) => {
				if (parseError)
					done(parseError);
				else if (isEmpty(obj.access_token))
					done(new Error('Invalid Credentials. No access token was received.'));
				else
					done(null, obj.access_token);
			});
		},
		(token, done) => {
			let hasMoreResults = true;
			let offset = 0;

			async.whilst(() => {
				return hasMoreResults;
			}, (cb) => {
				request.get({
					url: `${ARTIK_CLOUD_ENDPOINT}/users/${config.user_id}/devices?offset=${100 * offset}&count=100`,
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					}
				}, (error, response, body) => {
					if (error)
						cb(error);
					else if (body.error || response.statusCode !== 200)
						cb(new Error(body.error));
					else {
						offset++;

						syncDevices(body, (syncError, count) => {
							if (error) return cb(error);
							if (count <= 0) hasMoreResults = false;

							cb();
						});
					}
				});
			}, done);
		}
	], (error) => {
		if (error) platform.handleException(error);
	});
});

/**
 * Emitted when the platform shuts down the plugin. The Device Integration should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	platform.notifyClose();
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The parameters or options. Specified through config.json.
 */
platform.once('ready', function (options) {
	config = options;
	platform.notifyReady();
	platform.log('Artik Device Integration has been initialized.');
});