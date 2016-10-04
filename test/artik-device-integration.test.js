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

    after('terminate child process', function (done) {
        this.timeout(20000);

        setTimeout(() => {
            artikDeviceIntegration.kill('SIGKILL');
            done();
        }, 19000);
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
                else if (message.type === 'upsertdevice')
                    console.log(message.data);
                else if (message.type === 'error')
                    console.error(message.data);
            });

            artikDeviceIntegration.send({
                type: 'ready',
                data: {
                    options: {
                        client_id: 'a5047035ee004c69bf3ff607aa357a19',
                        client_secret: '81582b3d43ec4a9f9115152618ed9a8c',
                        user_id: '8f2bec16d5c146b78c7b9accd926b380'
                    }
                }
            }, function (error) {
                assert.ifError(error);
            });
        });
    });

    describe('#sync', function () {
        it('should sync latest data of every device', function(done) {
            artikDeviceIntegration.send({
                type: 'sync',
                data: {
                    last_sync_dt: new Date('12-12-1970')
                }
            }, done);
        });
    });
});