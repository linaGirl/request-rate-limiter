import section from 'section-tests';
import assert from 'assert';

import RequestRateLimiter, { MockRequestHandler } from '../index.mjs';


section('Rate Limiter', (section) => {
    section.test('set the request handler', async() => {
        const limiter = new RequestRateLimiter();
        limiter.setRequestHandler(new MockRequestHandler());
    });


    section.test('return request response', async() => {
        const limiter = new RequestRateLimiter();
        limiter.setRequestHandler(new MockRequestHandler());

        const response = await limiter.request({});
        assert.deepStrictEqual(response, { status: 'good' });
    });


    section.test('enqueue one request', async() => {
        const limiter = new RequestRateLimiter();
        limiter.setRequestHandler(new MockRequestHandler());

        await limiter.request({});
    });


    section.test('enqueue one request, fail', async() => {
        const limiter = new RequestRateLimiter();
        limiter.setRequestHandler(new MockRequestHandler());

        await limiter.request({ action: 'fail' }).catch((err) => {
            assert(err);
            assert.equal(err.message, 'Fail!')
        });
    });


    section.test('enqueue one request, back off', async() => {
        const limiter = new RequestRateLimiter({
            backoffTime: .5,
        });

        limiter.setRequestHandler(new MockRequestHandler());

        const start = Date.now();
        await limiter.request({ action: 'backoff' });

        // needs to take 1-5 secs, because the leaky bucket is drained on pause
        // and the request has a value of 1 and the backoff time is .5
        assert(Date.now() - start > 1500);
    });


    section.test('idle promise', async() => {
        const limiter = new RequestRateLimiter();
        limiter.setRequestHandler(new MockRequestHandler());
        let idleCalled = false;

        await limiter.request({});
        limiter.idle().then(() => idleCalled = true);

        await limiter.request({});
        assert.equal(idleCalled, true);
    });
});
