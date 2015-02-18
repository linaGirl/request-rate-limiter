# request-rate-limiter

Call HTTP APIs that have rate limits and allow request bursts. This module depends on a leaky-bucket for doing the rate limit. Backs off when a HTTP 429 «Too Many Requests» is encountered.

This module uses [sematic versioning](http://semver.org/)

## installation

    npm i request-rate-limiter

## build status

[![Build Status](https://travis-ci.org/eventEmitter/request-rate-limiter.png?branch=master)](https://travis-ci.org/eventEmitter/request-rate-limiter)


## usage

The constructor accepts one argument. The argument can be a number (the rate limit) or an config object. 


    var RateLimiter = require('request-rate-limiter');


Create a rate limiter which can send 120 requests per minute.

    var limiter = new RateLimiter(120);

Create a rate limiter which can send 60 requests per minute.

    var limiter = new RateLimiter();

Create a rate limiter which can send 60 requests every 30 seconds.


    var limiter = new RateLimiter({
          rate: 60              // requests per interval, 
                                // defaults to 60
        , interval: 30          // interval for the rate, x 
                                // requests per interval, 
                                // defaults to 60
        , backoffCode: 429      // back off when this status is
                                // returned, defaults to 429
        , backoffTime: 10       // back off for n seconds, 
                                // defauts to rate/5
        , maxWaitingTime: 300   // return errors for requests
                                // that will have to wait for
                                // n seconds or more. defaults
                                // to 5 minutes
    });


If requests are rejected because they cannot be executed in time, they will return out of order. This means if you enqueue 100 requests and only 70 can be sent in time, the 30 requests that cannot be executed will return with an error immediately, long before the other requests that are still enqueued.


### Execute requests

This module relies on the [request module by mikael](https://www.npmjs.com/package/request). The configuration passed to the «request» method gets passed directly to that module. The response body, if present, is not returned as separate variable, it is instead available as the «body» property of the response object.


Execute a request using callbacks

    limiter.request({
          url       : 'awesome.api/resource'
        , method    : 'get'
    }, function(err, response) {

    });


Execute a request using Promises


    limiter.request({
          url       : 'awesome.api/resource'
        , method    : 'get'
    }).then(function(response) {

    }).catch(function(err) {

    });