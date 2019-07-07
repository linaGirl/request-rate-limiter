import request from 'request';
import BackoffError from './BackoffError.mjs';


export default class RequestRequestHandler {
    

    constructor({
        backoffHTTPCode = 429,
    } = {}) {
        this.backoffHTTPCode = backoffHTTPCode;
    }



    // simple promise wrapper for executing a request using the 
    // request libary
    async request(requestConfig) {
        return new Promise((resolve, reject) => {
            request(requestConfig, (err, response, body) => {
                if (err) {
                    reject(err);
                } else if (response.statusCode === this.backoffHTTPCode) {
                    reject(new BackoffError(`The request returned the status ${this.backoffHTTPCode}. Need to back off!`));
                } else {
                    resolve(response);
                }
            });
        });
    }
}