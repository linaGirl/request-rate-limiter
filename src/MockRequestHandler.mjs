import BackoffError from './BackoffError.mjs';


export default class MockRequestHandler {


    async request(requestConfig) {
        if (requestConfig.action === 'fail') {
            throw new Error('Fail!');
        } else if (requestConfig.action === 'backoff' && !requestConfig.counter) {
            requestConfig.counter = 1;
            throw new BackoffError('back off!');
        } else {
            return {
                status: 'good',
            }
        }
    }
}