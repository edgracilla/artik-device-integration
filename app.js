'use strict'

const reekoh = require('reekoh')
const plugin = new reekoh.plugins.InventorySync()

const async = require('async')
const get = require('lodash.get')
const request = require('request')
const isEmpty = require('lodash.isempty')

let _options = {}

plugin.once('ready', () => {
  _options = plugin.config
  plugin.log('Device sync has been initialized.')
  plugin.emit('init')
})

plugin.on('sync', () => {
  async.waterfall([
    (done) => {

      let postInfo = {
        url: _options.token_endpoint,
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
          url: `${_options.cloud_endpoint}/users/${_options.user_id}/devices?offset=${100 * offset}&count=100`,
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
              plugin.syncDevice(device)
                .then(next)
                .catch(next)
            }, cb)
          }
        })
      }, done)
    }
  ], (error) => {
    if (error) return plugin.logException(error)
    plugin.emit('syncDone')
  })
})

module.exports = plugin