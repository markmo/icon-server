'use strict';

const crypto = require('crypto')
const env = require('node-env-file')
const express = require('express')
const fetch = require('node-fetch')
const OAuth = require('oauth-1.0a')
const swaggerJSDoc = require('swagger-jsdoc')

const options = {
  swaggerDefinition: {
    info: {
      title: 'icon-server',
      version: '1.0.0'
    },
    basePath: '/icon-server'
  },
  apis: ['./server.js']
}

const swaggerSpec = swaggerJSDoc(options)

env(__dirname + '/.env')
const PORT = 8080
const KEY = process.env.NOUN_PROJECT_API_KEY
const SECRET = process.env.NOUN_PROJECT_API_SECRET

const hashFunctionSha1 = (baseString, key) => {
  return crypto
    .createHmac('sha1', key)
    .update(baseString)
    .digest('base64')
}

const oauth = OAuth({
  consumer: {
    key: KEY,
    secret: SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function: hashFunctionSha1
})

const app = express()
app.disable('etag')
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})
app.get('/', function (req, res) {
  res.send('Icon Server v1.0')
})
app.get('/api-docs.json', function (req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

/**
 * @swagger
 * /icon/{searchTerm}:
 *   get:
 *     description: Get a suggested icon (URL) for the search term.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: searchTerm
 *         description: the search term to find an icon
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Successful request
 *       500:
 *         description: Error fetching suggested icon from Noun Project
 */
app.get('/icon/:searchTerm', function (req, res) {
  const searchTerm = req.params.searchTerm
  const url = 'http://api.thenounproject.com/icon/' + searchTerm
  const requestData = {
    url,
    method: 'GET'
  }
  const headers = new fetch.Headers(Object.assign(
    {},
    { Accept: 'application/json' },
    oauth.toHeader(oauth.authorize(requestData))
  ))
  fetch(url, { headers })
    .then((resp) => resp.json())
    .then((json) => {
      const icon = json.icon.preview_url
      res.send(icon)
    })
    .catch((err) => {
      console.error('Error fetching icon;', err)
      res.status(500).send({
        status: 500,
        message: 'Error fetching icon'
      })
    })
})

app.listen(PORT)
console.log('Icon server running on port:' + PORT)
