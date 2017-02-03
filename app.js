'use strict'

const reekoh = require('demo-reekoh-node')
const _plugin = new reekoh.plugins.DeviceSync()

const async = require('async')
const get = require('lodash.get')
const request = require('request')
const isEmpty = require('lodash.isempty')

const TOKEN_ENDPOINT = 'https://accounts.artik.cloud/token'
const ARTIK_CLOUD_ENDPOINT = 'https://api.artik.cloud/v1.1'

let _options = {
  user_id: process.env.ARTIK_USER_ID,
  client_id: process.env.ARTIK_CLIENT_ID,
  client_secret: process.env.ARTIK_CLIENT_SECRET
}

_plugin.once('ready', () => {
  _plugin.log('Device sync has been initialized.')
  setImmediate(() => { process.send({ type: 'ready' }) }) // for mocha
})

_plugin.on('sync', () => {
  async.waterfall([
    (done) => {

      let postInfo = {
        url: TOKEN_ENDPOINT,
        form: { grant_type: 'client_credentials' },
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        auth: { user: _options.client_id, pass: _options.client_secret },
        json: true
      }

      request.post(postInfo, (error, response, body) => {
        if (error) {
          done(error)
        } else if (body.error || response.statusCode !== 200) {
          done(new Error(body.error.message || body.error))
        } else if (isEmpty(body.access_token)) {
          done(new Error('Invalid Credentials. No access token was received.'))
        } else					{
          done(null, body.access_token)
        }
      })

    }, (token, done) => {

      let offset = 0
      let hasMoreResults = true

      async.whilst(() => {
        return hasMoreResults
      }, (cb) => {

        let getInfo = {
          url: `${ARTIK_CLOUD_ENDPOINT}/users/${_options.user_id}/devices?offset=${100 * offset}&count=100`,
          json: true,
          auth: { bearer: token }
        }

        request.get(getInfo, (error, response, body) => {
          if (error) {
            cb(error)
          } else if (body.error || response.statusCode !== 200) {
            cb(new Error(body.error.message || body.error))
          } else {
            let devices = get(body, 'data.devices')
            if (isEmpty(devices) <= 0) hasMoreResults = false

            offset++

            async.each(devices, (device, next) => {
              _plugin.syncDevice(device)
                .then(next)
                .catch(next)
            }, cb)
          }
        })
      }, done)
    }
  ], (error) => {
    if (error) return _plugin.logException(error)
    process.send({ type: 'syncDone' })
  })
})

_plugin.on('adddevice', (device) => {

})

_plugin.on('updatedevice', (device) => {

})

_plugin.on('removedevice', (device) => {

})
