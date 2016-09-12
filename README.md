# request-rate-limiter

Call HTTP APIs that have rate limits and allow request bursts. This module depends on a leaky-bucket for doing the rate limit. Backs off when a HTTP 429 «Too Many Requests» is encountered.

This module uses [sematic versioning](http://semver.org/)

## installation

    npm i request-rate-limiter

## build status

[![Build Status](https://travis-ci.org/eventEmitter/request-rate-limiter.png?branch=master)](https://travis-ci.org/eventEmitter/request-rate-limiter)


## API

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

You may either use the built in [request module by mikael](https://www.npmjs.com/package/request) or use your own request implementation.

#### API Using the request module

The configuration passed to the «request» method gets passed directly to the [request module by mikael](https://www.npmjs.com/package/request). The response body, if present, is not returned as separate variable, it is instead available as the «body» property of the response object.


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



#### API Using your own request implementation


You only have to pass a callback to the request method, it gets executed as soon as the request should be sent. Your callback gets two parameters passed to it, the first is the error object, the second is a function that can be called when the rate limiter should back off for a certain amount of time. If the backoff function is called the same callback is called again later when the remote api accepts requests again.


Execute a request using callbacks

    // queue request
    limiter.request(function(err, backoff) {
        if (err) {
            // the err object is set if the limiter is overflowing or is not able to execute your request in time
        else {

            // its time to execute your request
            request({url: 'http://joinbox.com/...'}, function(err, response, body) {
                if (err) {
                    // oh crap
                }
                else if (response.statusCode === 429) {

                    // we have to back off. this callback will be called again as soon as the remote enpoint
                    // should accept requests again. no need to queue your callback another time on the limiter.
                    backoff();
                }
                else {
                    // nice, your request looks good
                }
            });
        }
    });



Execute a request using Promises

    // queue request
    limiter.request().then(function(backoff) {

        // its time to execute your request
        request({url: 'http://joinbox.com/...'}, function(err, response, body) {
            if (err) callback(err);
            else if (response.statusCode === 429) {

                // we have to back off. this callback will be called again as soon as the remote enpoint
                // should accept requests again. no need to queue your callback another time on the limiter.
                backoff();
            }
            else callback(body);
        });
    }).catch(function(err) {

         // the err object is set if the limiter is overflowing or is not able to execute your request in time
    });
