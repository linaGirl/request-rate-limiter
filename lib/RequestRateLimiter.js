!function() {

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , request       = require('request')
        , type          = require('ee-types')
        , asyncMethod   = require('async-method')
        , LeakyBucket   = require('leaky-bucket')
        , debug         = require('ee-argv').has('debug-request-rate-limiter') || process.env['debug-request-rate-limiter']
        , logId         = 0;





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
            else if (type.object(options)) {
                if (type.number(options.rate)) this.rate = options.rate;
                if (type.number(options.interval)) this.interval = options.interval;
                if (type.number(options.backoffCode)) this.backoffCode = options.backoffCode;

                if (type.number(options.backoffTime)) this.backoffTime = options.backoffTime;
                else this.backoffTime = Math.round(this.rate/5);

                if (type.number(options.maxWaitingTime)) this.maxWaitingTime = options.maxWaitingTime;
            }

            // id for logging purposes
            this.logId = logId++;


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

            if (debug) {
                if (type.function(config)) log.debug('[%s] Got request ...', this.logId);
                else log.debug('[%s] Got request for url %s ...', this.logId, config.url);
            }


            var executeRequest = function(err, cb) {
                if (cb) config = cb;

                if (err) {
                    // fail, it would take way too long
                    // to execute the requesz
                    if (debug) {
                        if (type.function(config)) log.info('[%s] Throttling of the request failed, max allowed waiting time of %s seconds exceeded ...', this.logId, this.maxWaitingTime);
                        else log.info('[%s] Throttling of the request on %s failed, max allowed waiting time of %s seconds exceeded ...', this.logId, config.url, this.maxWaitingTime);
                    }

                    if (type.function(config)) config(new Error('The request was not executed because it would not be scheduled within the max waiting time!'));
                    else callback(new Error('The request was not executed because it would not be scheduled within the max waiting time!'));
                }
                else {
                    // execute the request
                    if (debug) log.debug('[%s] Request on %s is firing now...', this.logId, config.url);

                    if (type.function(config)) {
                        // the user exsutes teh request

                        config(null, function() {

                            // this backoff callback called by the 
                            // user as sonn as we need to back off
                            this.backoff(function() {
                                executeRequest(null, config);
                            }.bind(this));
                        }.bind(this));
                    }
                    else this._request(config, callback);
                }
            }.bind(this);


            this.bucket.throttle(executeRequest);
        })




        /**
         * backs off when the api requires us to do so
         *
         * @param {function|object} config config object or callback function
         * @param {function|undefiend} callback or callback
         */
        , backoff: function(config, callback) {
            if (debug) {
                if (type.function(config)) log.debug('[%s] The peer instructed us to back off, backing off now ...', this.logId);
                else log.debug('[%s] The peer returned the backoff status code %s for the url %s, backing off ...', this.logId, this.backoffCode, config.url);
            }

            // got the backoff status code, wait some time
            if (!this.backoffTimer) {
                this.backoffTimer = setTimeout(function() {
                    this.backoffTimer = null;
                }.bind(this), this.backoffTime*1000);

                if (debug) log.info('[%s] Pausing the leaky bucket for %s seconds ...', this.logId, this.backoffTime);

                // pause the bucket
                this.bucket.pause(this.backoffTime);
            }


            // add the request at the beginning of the queue
            this.bucket.reAdd(function(err) {
                if (err) {
                     if (type.function(config)) config(new Error('The request was not executed because it would not be scheduled within the max waiting time!'));
                     else callback(new Error('The request was not executed because it would not be scheduled within the max waiting time!'));
                }
                else {
                    if (type.function(config)) config();
                    else this._request(config, callback);
                }
            }.bind(this));
        }





        /**
         * send a request
         *
         * @param <object> request config
         * @param <function> callback
         */
        , _request: function(config, callback) {
            request(config, function(err, response, body) {
                if (err) {
                    if (debug) log.warn('[%s] The request for the url %s failed: %s ...', this.logId, config.url, err.message);

                    callback(err);
                }
                else if (response.statusCode === this.backoffCode) this.backoff(config, callback);
                else {
                     if (debug) log.debug('[%s] The request for the url %s succeeded with the status %s ...', this.logId, config.url, response.statusCode);

                    callback(null, response);
                }
            }.bind(this));
        }
    });
}();
