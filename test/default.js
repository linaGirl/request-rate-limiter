
	
	//process.env['debug-request-rate-limiter'] = true;
	//process.env['debug-leaky-bucket'] = true;


	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, WebService 	= require('ee-webservice')
		, LeakyBucket 	= require('leaky-bucket')
		, assert 		= require('assert');




	var   RateLimiter = require('../')
		, bucket1 = new LeakyBucket(60, 60, -1)
		, bucket2 = new LeakyBucket(60, 60, -1)
		, url = 'http://localhost:9254/'
		, service = new WebService({
			  interface: 5
			, port: 9254
		});



	// rate limited webserver
	service.use(function(request, response) {
		(request.pathname === '/1/' ? bucket1 : bucket2).throttle(function(err) {
			if (err) response.send(429);
			else response.send(200, '{"id":1}');
		});
	});




	describe('The RateLimiter', function() {

		before(function(done) {
			service.listen(done);
		});


		it('should not crash when instantiated', function() {
			var limiter = new RateLimiter();
		});


		it('should rate limit requests', function(done) {
			var limiter = new RateLimiter({
				rate: 60
			});


			this.timeout(15000);


			var   requestCount = 60
				, expectedOkCount = 60
				, expectedErrCount = 0
				, errCount = 0
				, okCount = 0
				, minTime = 0
				, maxTime = 1000
				, start = Date.now()
				, duration;


			var cb = function(err) {
				if (err) errCount++;
				else okCount++;

				if (okCount+errCount === expectedOkCount+expectedErrCount) {
					duration = Date.now()-start;

                    assert(duration>=minTime, 'The limiter finished too soon ('+duration+' < '+minTime+') ...');
                    assert(duration<maxTime, 'The limiter finished too late ('+duration+' > '+maxTime+') ...');
                    assert(errCount===expectedErrCount, 'The limiter should have emitted '+expectedErrCount+' errros, it emitted '+errCount+' errors...');

					done();
				}
			}


			while (requestCount--) {
				limiter.request({
					  method : 'get'
					, url 	 : url+'1/#id='+requestCount
				}, cb);
			}
		});




		it('it shoud back off if required', function(done) {
			var limiter = new RateLimiter({
				  rate: 70
				, backoffTime: 5
			});


			this.timeout(15000);


			var   requestCount = 70
				, expectedOkCount = 70
				, expectedErrCount = 0
				, errCount = 0
				, okCount = 0
				, minTime = 13500
				, maxTime = 14500
				, start = Date.now()
				, duration;


			var cb = function(err) {
				if (err) errCount++;
				else okCount++;

				if (okCount+errCount === expectedOkCount+expectedErrCount) {
					duration = Date.now()-start;


                    assert(duration>=minTime, 'The limiter finished too soon ('+duration+' < '+minTime+') ...');
                    assert(duration<maxTime, 'The limiter finished too late ('+duration+' > '+maxTime+') ...');
                    assert(errCount===expectedErrCount, 'The limiter should have emitted '+expectedErrCount+' errros, it emitted '+errCount+' errors...');

					done();
				}
			}


			while (requestCount--) {
				limiter.request({
					  method : 'get'
					, url 	 : url+'2/#id='+requestCount
				}, cb);
			}
		});
	});
	