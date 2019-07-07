
# request-rate-limiter

A simple leaky-bucket based request rate limiter. Mostly used for clients that work against an API that makes use of a leaky bucket for rate limiting incoming requests. Backs off when an API returns the HTTP 429 HTTP «Too Many Requests» status is encountered.

Provides a request module based on the [request module by mikael](https://www.npmjs.com/package/request). You may also implement your own request handler module in a very simple way.

ATTENTION: The API of Version 2+ is not backwards compatible with the API of version 1!

ATTENTION: This module makes use of es modules and thus needs to be started using the --experimental-modules flag in node 10 and 12.



[![Build Status](https://travis-ci.org/eventEmitter/request-rate-limiter.png?branch=master)](https://travis-ci.org/eventEmitter/request-rate-limiter)

## API

### constructor

The constructor accepts 4 optional options, which can be used to configure the behaviour of the limiter:
- backoffTime: how many seconds to back off when the remote end indicates to back off
- requestRate: how many requests can be sent within the interval
- interval: the interval within the all requests of the requestRate should be exeuted
- timeout: no request will stay in the queue any longer than the timeout. if the queue is full, the requst will be rejected

```javascript

import RequestRateLimiter from 'request-rate-limiter';

const limiter = new RequestRateLimiter({
    backoffTime: 10,
    requestRate: 60,
    interval: 60,
    timeout: 600,
});

```

### setRequestHandler

Used to pass a request handler to the limiter


Make use of the request handler provided by this module
```javascript
import RequestRateLimiter, { RequestsRequestHandler } from 'request-rate-limiter';

const limiter = new RequestRateLimiter();

limiter.setRequestHandler(new RequestsRequestHandler({
    backoffHTTPCode: 429,
}));
```

Implement your own request implementation
```javascript
import RequestRateLimiter, { BackoffError } from 'request-rate-limiter';

const limiter = new RequestRateLimiter();



class MyRequestHandler {

    // this method is th eonly required interface to implement
    // it gets passed the request onfig that is passed by the 
    // user to the request method of the limiter. The mehtod msut
    // return an instance of the BackoffError when the limiter 
    // needs to back off
    async request(requestConfig) {
        const response = sendRequestUsingSomeLibrary(requestConfig);

        if (response.statusCode === 429) throw new BackoffError(`Need to nack off guys!`);
        else return response;
    }
}

limiter.setRequestHandler(new MyRequestHandler());
```


### request

The request method is used to send rate limited requests. You need to pass the configuration of the request
to it, which later will be passed to the request handler (see above).

```javascript
import RequestRateLimiter, { RequestsRequestHandler } from 'request-rate-limiter';

const limiter = new RequestRateLimiter();
limiter.setRequestHandler(new RequestsRequestHandler());


// just send one request
const response = await limiter.request('https://joinbox.com/');


// send requests one after another, waiting for each one to finish 
// before the next one is sent
for (const requestConfig of requests) {
    const response = await limiter.request(requestConfig);
}

// send a buch of requests in parallel
await Promise.all(requests.map(async(requestConfig) => {
    const response = await limiter.request(requestConfig);
}));

```





### idle

The idle method returns a promise which is called when the limiter becomes idle. It's like
a once event listener which means that one the promise is resolved on must call the idle method
again to wait on the next bucnh of requests to complete and the limiter to become idle

```javascript
import RequestRateLimiter, { RequestsRequestHandler } from 'request-rate-limiter';

const limiter = new RequestRateLimiter();
limiter.setRequestHandler(new RequestsRequestHandler());



// send a buch of requests in parallel
Promise.all(requests.map(async(requestConfig) => {
    const response = await limiter.request(requestConfig);
})).catch((err) => {
    // this happens if the bucket is overflowing
});

// wait until th elimiter becomes idle
await limiter.idle();

```