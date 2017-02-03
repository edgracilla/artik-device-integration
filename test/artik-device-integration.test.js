/* global describe, it, after, before */
'use strict'

const cp = require('child_process')
const should = require('should')
const amqp = require('amqplib')

let deviceSync = null
let _channel = {}
let _conn = null

describe('Device-integration', function () {
  this.slow(5000)

  before('init', () => {
    process.env.PLUGIN_ID = 'demo.dev-sync'
    process.env.BROKER = 'amqp://guest:guest@127.0.0.1/'

    process.env.ARTIK_CLIENT_ID = 'a5047035ee004c69bf3ff607aa357a19'
    process.env.ARTIK_CLIENT_SECRET = '81582b3d43ec4a9f9115152618ed9a8c'
    process.env.ARTIK_USER_ID = '8f2bec16d5c146b78c7b9accd926b380'

    amqp.connect(process.env.BROKER)
      .then((conn) => {
        _conn = conn
        return conn.createChannel()
      }).then((channel) => {
        _channel = channel
      }).catch((err) => {
        console.log(err)
      })
  })

  after('terminate child process', function (done) {
    this.timeout(20000)

    setTimeout(() => {
      _conn.close()
      deviceSync.kill('SIGKILL')
      done()
    }, 19000)
  })

  describe('#spawn', function () {
    it('should spawn a child process', function () {
      should.ok(deviceSync = cp.fork(process.cwd()), 'Child process not spawned.')
    })
  })

  describe('#handShake', function () {
    it('should notify the parent process when ready within 5 seconds', function (done) {
      this.timeout(5000)

      deviceSync.on('message', function (message) {
        if (message.type === 'ready') {
          done()
        }
      })
    })
  })

  describe('#sync', function () {
    it('should sync latest data of every device', function (done) {
      this.timeout(8000)

      _channel.sendToQueue(process.env.PLUGIN_ID, new Buffer(JSON.stringify({ operation: 'sync' })))

      deviceSync.on('message', function (message) {
        if (message.type === 'syncDone') {
          done()
        }
      })
    })
  })
})
