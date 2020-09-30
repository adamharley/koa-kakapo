'use strict'

const { IncomingMessage, ServerResponse } = require('http')
const { Socket } = require('net')
const compose = require('koa-compose')

// Ingest Lambda / API Gateway v2.0 call and pass to Koa in (req, res) format
//
// This is written bare metal because aws-serverless-express is rather heavy, using a local sockets for traffic,
// and aws-serverless-koa is just a one line wrapper around the aforementioned library, still using Express
//
// See https://github.com/awsdocs/aws-lambda-developer-guide/blob/master/sample-apps/nodejs-apig/event-v2.json
// for an example structure of the event object being passed from API Gateway
// and https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html for a context object example
//
// IncomingMessage: https://github.com/nodejs/node/blob/master/lib/_http_incoming.js#L42
// ServerResponse: https://github.com/nodejs/node/blob/master/lib/_http_server.js#L158
// Koa: https://github.com/koajs/koa/tree/master/lib

module.exports = async (event, context, app) => {
  // hello, I am a socket
  const socket = new Socket()

  // build request object from AWS Lambda event triggered by API Gateway
  const req = new IncomingMessage(socket)
  req.headers = event.headers
  req.method = event.requestContext.http.method
  req.url = event.rawPath

  // append query string if present
  if (event.rawQueryString) {
    req.url += '?' + event.rawQueryString
  }

  // restore cookies as headers
  if (event.cookies) {
    req.headers.cookie = event.cookies.join('; ')
  }

  // build response object from request object
  const res = new ServerResponse(req)
  res.statusCode = 404

  // build Koa context
  const ctx = app.createContext(req, res)

  // attach POST body in koa-body style
  if (event.body) {
    ctx.request.body = event.body
  }

  // pass request to Koa middleware
  const fn = compose(app.middleware)
  await fn(ctx)

  // return response
  return ctx.res
}