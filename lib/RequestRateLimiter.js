!function() {

	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
        , type          = require('ee-types')
        , asyncMethod   = require('async-method')
        , Promise       = (Promise || require('es6-promise').Promise)
        , LeakyBucket   = require('leaky-bucket');





	module.exports = new Class({

        // default rate limit
          rate: 60


        // interval fot the rate in seconds
        , interval: 60


        // http status returned by http requests
        // if we need to back off for some time
        , backoffCode: 429


        // how long to wait until we should
        // continue to send requests after we 
        // got the backoff status from the peer
        // unit: seconds
        , backoffTime: 10


        // how long can a request qait until it
        // should be retuned with an error
        // unit: seconds
        , maxWaitingTime: 300



        // backoff status indicating if we're 
        // currently in a backoff phase
        , backoffTimer: null



        /**
         * constructor
         *
         * @param <number|object> rate or config object
         */
		, init: function(options) {

            // parse options
            if (type.number(options)) {
                this.rate = options;
            }
            else if (type.object(options) && options !== null) {
                if (type.number(options.rate)) this.rate = options.rate;
                if (type.number(options.interval)) this.interval = options.interval;
                if (type.number(options.backoffCode)) this.backoffCode = options.backoffCode;

                if (type.number(options.backoffTime)) this.backoffTime = options.backoffTime;
                else this.backoffTime = Math.round(this.rate/5);

                if (type.number(options.maxWaitingTime)) this.maxWaitingTime = options.maxWaitingTime;
            }


            // set up the leaky bucket
            this.bucket = new LeakyBucket({
                  capacity       : this.rate
                , maxWaitingTime : this.maxWaitingTime
                , interval       : this.interval
            });
		}




        /**
         * send rate limited requests
         *
         * @param <object> request configuration
         * @param <function> optional callback, if omitted
         *                   a promise is retuned
         */
        , request: asyncMethod(function(config, callback) {
            this.bucket.throttle().then(function() {
                // execute the request


            }.bind(this)).catch(function(err) {
                // fail, it would take way too long
                // to execute the requesz

                callback(new Error('The request was not executed because it would not be scheduled within the max waiting time!'));
            }.bind(this));
        })




        /**
         * send a request
         *
         * @param <object> request config
         * @param <function> callback
         */
        , _request: function(config, callback) {
            request(config, function(err, response, body) {
                if (err) callback(err);
                else if (response.statusCode === this.backoffCode) {

                    // got the backoff status code, wait some time
                    if (!this.backoffTimer) {
                        this.backoffTimer = setTimeout(function() {
                            this.backoffTimer = null;
                        }.bind(this), this.backoffTime*1000);

                        // pause the bucket
                        this.bucket.pause(this.backoffTime);
                    }


                    // add the request at the beginning of the queue
                    this.bucket.reAdd(function(err) {
                        if (err) callback(new Error('The request was not executed because it would not be scheduled within the max waiting time!'));
                        else this._request(config, callback);
                    }.bind(this));
                }
                else callback(null, response);
            }.bind(this));
        }
	});
}();
