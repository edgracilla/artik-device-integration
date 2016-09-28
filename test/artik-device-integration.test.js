/*
 * Just a sample code to test the device integration plugin.
 * Kindly write your own unit tests for your own plugin.
 */
'use strict';

var cp     = require('child_process'),
    assert = require('assert'),
    artikDeviceIntegration;

describe('Device-integration', function () {
    this.slow(5000);

    after('terminate child process', function () {
        artikDeviceIntegration.kill('SIGKILL');
    });

    describe('#spawn', function () {
        it('should spawn a child process', function () {
            assert.ok(artikDeviceIntegration = cp.fork(process.cwd()), 'Child process not spawned.');
        });
    });

    describe('#handShake', function () {
        it('should notify the parent process when ready within 5 seconds', function (done) {
            this.timeout(5000);

            artikDeviceIntegration.on('message', function (message) {
                if (message.type === 'ready')
                    done();
            });

            artikDeviceIntegration.send({
                type: 'ready',
                data: {
                    options: {
                        client_id: 'b13c60dd1f264224a34d1e9c3d44ec27',
                        client_secret: '7c08cea3447442acb7bef36dcdb99fb6',
                        user_id: 'a103bd5381bc4d18b8dee8a728a5e0a2'
                    }
                }
            }, function (error) {
                assert.ifError(error);
            });
        });
    });

    describe('#sync', function () {
        this.timeout(10000);
        it('should sync latest data of every device', function(done) {
            let isCalled = false;
            artikDeviceIntegration.send({
                type: 'sync',
                data: {
                    last_sync_dt: new Date('12-12-1970')
                }
            });

            artikDeviceIntegration.on('message', function (message) {
                if (message.type === 'upsertdevice') {
                    console.log(message.data);
                    if (!isCalled) {
                        done();
                        isCalled = true;
                    }
                }
            });
        });
    });
});