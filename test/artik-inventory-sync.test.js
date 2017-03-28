/* global describe, it, after, before */
'use strict'

const amqp = require('amqplib')
const should = require('should')

const PLUGIN_ID = 'demo.dev-sync'
const BROKER = 'amqp://guest:guest@127.0.0.1/'

let conf = {
  user_id: '8f2bec16d5c146b78c7b9accd926b380',
  client_id: 'a5047035ee004c69bf3ff607aa357a19',
  client_secret: '81582b3d43ec4a9f9115152618ed9a8c',
  token_endpoint: 'https://accounts.artik.cloud/token',
  cloud_endpoint: 'https://api.artik.cloud/v1.1'
}

let _app = null
let _conn = null
let _channel = null

describe('Artik Inventory Sync', function () {

  before('init', () => {

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

  after('terminate', function () {
    _conn.close()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(10000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#sync', function () {
    it('should execute device sync', function (done) {
      this.timeout(10000)
      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify({ operation: 'sync' })))
      _app.on('syncDone', done)
    })
  })
})
