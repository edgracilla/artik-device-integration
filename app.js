'use strict';

var platform = require('./platform'),
    request = require('request'),
    async = require('async'),
    client_id,
    client_secret,
    user_id;

/**
 * Emitted when the platform issues a sync request. Means that the device integration should fetch updates from the
 * 3rd party service.
 */
platform.on('sync', function (lastSyncDate) {
    async.waterfall([
        (done) => {
            let clientCredentialsOptions = {
                method: 'POST',
                url: 'https://accounts.artik.cloud/token',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                form: {grant_type: 'client_credentials'},
                auth: {
                    user: client_id,
                    pass: client_secret
                }
            };
            request(clientCredentialsOptions, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    let token = JSON.parse(body).access_token;
                    done(null, token);
                } else {
                    error = error ? error : new Error(body.error);
                    done(error);
                }
            });
        },
        (token, done) => {
            let userDevicesOptions = {
                url: `https://api.artik.cloud/v1.1/users/${user_id}/devices`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            request(userDevicesOptions, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    let data = JSON.parse(body).data;
                    let devices = [];

                    data.devices.forEach((device) => {
                        platform.syncDevice(device);
                    });
                    done(null, token, devices);
                } else {
                    error = error ? error : new Error(body.error);
                    done(error);
                }
            });
        }
    ], (error) => {
        platform.handleException(error);
    });
});

/**
 * Emitted when the platform shuts down the plugin. The Device Integration should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
    let d = require('domain').create();

    d.once('error', function (error) {
        console.error(error);
        platform.handleException(error);
        platform.notifyClose();
        d.exit();
    });

    d.run(function () {
        // TODO: Release all resources and close connections etc.
        platform.notifyClose(); // Notify the platform that resources have been released.
        d.exit();
    });
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The parameters or options. Specified through config.json.
 */
platform.once('ready', function (options) {
    client_id = options.client_id;
    client_secret = options.client_secret;
    user_id = options.user_id;

    console.log(options);
    platform.notifyReady();
    platform.log('Artik device integration has been initialized.');
});