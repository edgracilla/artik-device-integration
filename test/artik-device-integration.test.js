/* global describe, it, after, before */
'use strict'

const amqp = require('amqplib')
const should = require('should')
const cp = require('child_process')

const PLUGIN_ID = 'demo.dev-sync'
const BROKER = 'amqp://guest:guest@127.0.0.1/'

let _conn = null
let _plugin = null
let _channel = null

describe('Artik Inventory Sync', function () {
  this.slow(5000)

  before('init', () => {

    let conf = {
      user_id: '8f2bec16d5c146b78c7b9accd926b380',
      client_id: 'a5047035ee004c69bf3ff607aa357a19',
      client_secret: '81582b3d43ec4a9f9115152618ed9a8c',
      token_endpoint: 'https://accounts.artik.cloud/token',
      cloud_endpoint: 'https://api.artik.cloud/v1.1'
    }

    process.env.BROKER = BROKER
    process.env.PLUGIN_ID = PLUGIN_ID
    process.env.CONFIG = JSON.stringify(conf)

    amqp.connect(BROKER).then((conn) => {
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
      _plugin.kill('SIGKILL')
      done()
    }, 19000)
  })

  describe('#spawn', function () {
    it('should spawn a child process', function () {
      should.ok(_plugin = cp.fork(process.cwd()), 'Child process not spawned.')
    })
  })

  describe('#handShake', function () {
    it('should notify the parent process when ready within 5 seconds', function (done) {
      this.timeout(8000)

      _plugin.on('message', function (message) {
        if (message.type === 'ready') {
          done()
        }
      })
    })
  })

  describe('#sync', function () {
    it('should sync latest data of every device', function (done) {
      this.timeout(8000)

      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify({ operation: 'sync' })))

      _plugin.on('message', function (message) {
        if (message.type === 'syncDone') {
          done()
        }
      })
    })
  })
})
