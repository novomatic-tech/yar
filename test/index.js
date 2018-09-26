'use strict';

// Load modules

const Boom = require('boom');
const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');

// Declare internals

const internals = {
    password: 'passwordmustbelongerthan32characterssowejustmakethislonger'
};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;



it('sets session value then gets it back (store mode)', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                let returnValue = request.yar.set('some', { value: '2' });
                expect(returnValue.value).to.equal('2');
                returnValue = request.yar.set('one', 'xyz');
                expect(returnValue).to.equal('xyz');
                request.yar.clear('one');
                return reply(Object.keys(request.yar._store).length);
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                const some = request.yar.get('some');
                some.raw = 'access';
                request.yar.touch();
                return reply(some.value);
            }
        },
        {
            method: 'GET', path: '/3', handler: (request, reply) => {

                const raw = request.yar.get('some').raw;
                request.yar.reset();
                return reply(raw);
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.result).to.equal(1);
                const header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.not.contain('Secure');
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.result).to.equal('2');
                    const header2 = res2.headers['set-cookie'];
                    const cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie2[1] } }, (res3) => {

                        expect(res3.result).to.equal('access');
                        done();
                    });
                });
            });
        });
    });
});

it('sets session value and wait till cache expires then fail to get it back', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        cache: {
            expiresIn: 1
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                request.yar.set('some', { value: '2' });
                request.yar.set('one', 'xyz');
                request.yar.clear('one');
                return reply(Object.keys(request.yar._store).length);
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                const some = request.yar.get('some');
                return reply(some);
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.result).to.equal(1);
                const header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.not.contain('Secure');
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                setTimeout(() => {

                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                        expect(res2.result).to.equal(null);
                        done();
                    });
                }, 10);
            });
        });
    });
});

it('sets session value then gets it back (cookie mode)', (done) => {

    const options = {
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                request.yar.set('some', { value: '2' });
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                return reply(request.yar.get('some').value);
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.result).to.equal('1');
                const header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.result).to.equal('2');
                    done();
                });
            });
        });
    });
});

it('sets session value then gets it back (hybrid mode)', (done) => {

    const options = {
        maxCookieSize: 10,
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                request.yar.set('some', { value: '12345678901234567890' });
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                return reply(request.yar.get('some').value);
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.result).to.equal('1');
                const header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.result).to.equal('12345678901234567890');
                    done();
                });
            });
        });
    });
});

it('sets session value then gets it back (lazy mode)', (done) => {

    const options = {
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                request.yar.lazy(true);
                request.yar.some = { value: '2' };
                request.yar._test = { value: '3' };
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                return reply(request.yar.some.value);
            }
        },
        {
            method: 'GET', path: '/3', handler: (request, reply) => {

                return reply(request.yar._test);
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.result).to.equal('1');
                const header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.result).to.equal('2');
                    const header2 = res2.headers['set-cookie'];
                    const cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie2[1] } }, (res3) => {

                        expect(res3.result).to.be.null();
                    });
                    done();
                });
            });
        });
    });
});

it('no keys when in session (lazy mode)', (done) => {

    const options = {
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                request.yar.lazy(true);
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                return reply(request.yar._store);
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.result).to.equal('1');
                const header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.result).to.be.empty();
                    done();
                });
            });
        });
    });
});

it('sets session value then gets it back (clear)', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                const returnValue = request.yar.set({
                    some: '2',
                    and: 'thensome'
                });
                expect(returnValue.some).to.equal('2');
                expect(returnValue.and).to.equal('thensome');
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                const some = request.yar.get('some', true);
                return reply(some);
            }
        },
        {
            method: 'GET', path: '/3', handler: (request, reply) => {

                const some = request.yar.get('some');
                return reply(some || '3');
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.result).to.equal('1');
                const header = res.headers['set-cookie'];
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.result).to.equal('2');
                    const header2 = res2.headers['set-cookie'];
                    const cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie2[1] } }, (res3) => {

                        expect(res3.result).to.equal('3');
                        done();
                    });
                });
            });
        });
    });
});

it('returns 500 when storing cookie in invalid cache by default', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                request.yar.set('some', { value: '2' });
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                return reply(request.yar.get('some'));
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                const header = res.headers['set-cookie'];
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server._caches._default.client.stop();
                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });
});

it('fails setting session key/value because of bad key/value arguments', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server({ debug: false });
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                request.yar.set({ 'some': '2' }, '2');
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                request.yar.set(45.68, '2');
                return reply('1');
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.statusCode).to.equal(500);
                server.inject({ method: 'GET', url: '/2' }, (res2) => {

                    expect(res2.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });
});

it('fails setting session key/value because of failed cache set', { parallel: false }, (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache.js');
    const setRestore = cache.prototype.set;
    cache.prototype.set = (key, value, ttl, callback) => {

        return callback(new Error('Error setting cache'));
    };
    const hapiOptions = {
        cache: {
            engine: require('./test-cache.js')
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);
    server.connection();

    const handler = (request, reply) => {

        request.yar.set('some', 'value');
        return reply();
    };

    server.route({ method: 'GET', path: '/', handler });

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/' }, (res) => {

                expect(res.statusCode).to.equal(500);
                cache.prototype.set = setRestore;
                done();
            });
        });
    });
});

it('does not try to store session when cache not ready if errorOnCacheNotReady set to false', { parallel: false }, (done) => {

    const options = {
        maxCookieSize: 0,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache');
    const getRestore = cache.prototype.get;
    const isReadyRestore = cache.prototype.isReady;

    cache.prototype.get = (callback) => {

        callback(new Error('Error getting cache'));
    };

    cache.prototype.isReady = () => {

        return false;
    };

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);
    server.connection();

    const preHandler = (request, reply) => {

        request.yar.set('some', 'value');
        return reply();
    };

    const handler = (request, reply) => {

        const some = request.yar.get('some');
        return reply(some);
    };

    server.route({
        method: 'GET',
        path: '/',
        config: {
            pre: [
                { method: preHandler }
            ],
            handler
        }
    });

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/' }, (res) => {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('value');
                cache.prototype.get = getRestore;
                cache.prototype.isReady = isReadyRestore;
                done();
            });
        });
    });
});

it('fails loading session from invalid cache and returns 500', { parallel: false }, (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache.js');

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);
    server.connection();

    server.route([
        {
            method: 'GET', path: '/', handler: (request, reply) => {

                request.yar.set('some', 'value');
                return reply('1');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                handlerSpy();
                request.yar.set(45.68, '2');
                return reply('1');
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/' }, (res) => {

                const header = res.headers['set-cookie'];
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('1');

                const getRestore = cache.prototype.get;
                const isReadyRestore = cache.prototype.isReady;

                cache.prototype.get = (callback) => {

                    callback(new Error('Error getting cache'));
                };

                cache.prototype.isReady = () => {

                    return false;
                };

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.statusCode).to.equal(500);
                    cache.prototype.get = getRestore;
                    cache.prototype.isReady = isReadyRestore;
                    done();
                });
            });
        });
    });
});

it('does not load from cache if cache is not ready and errorOnCacheNotReady set to false', { parallel: false }, (done) => {

    const options = {
        maxCookieSize: 0,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache');

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);
    server.connection();


    server.route([{
        method: 'GET', path: '/', handler: (request, reply) => {

            request.yar.set('some', 'value');
            return reply();
        }
    },
    {
        method: 'GET', path: '/2', handler: (request, reply) => {

            const value = request.yar.get('some');
            return reply(value || '2');
        }
    }]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/' }, (res) => {

                const header = res.headers['set-cookie'];
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);
                const isReadyRestore = cache.prototype.isReady;

                cache.prototype.isReady = () => {

                    return false;
                };

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result).to.equal('2');
                    cache.prototype.isReady = isReadyRestore;
                    done();
                });
            });
        });
    });
});

it('still loads from cache when errorOnCacheNotReady option set to false but cache is ready', { parallel: false }, (done) => {

    const options = {
        maxCookieSize: 0,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache');

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);
    server.connection();


    server.route([{
        method: 'GET', path: '/', handler: (request, reply) => {

            request.yar.set('some', 'value');
            return reply();
        }
    },
    {
        method: 'GET', path: '/2', handler: (request, reply) => {

            const value = request.yar.get('some');
            return reply(value || '2');
        }
    }]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/' }, (res) => {

                const header = res.headers['set-cookie'];
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result).to.equal('2');
                    done();
                });
            });
        });
    });
});

it('still saves session as cookie when cache is not ready if maxCookieSize is set and big enough', { parallel: false }, (done) => {

    const options = {
        maxCookieSize: 500,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache');

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };

    const server = new Hapi.Server(hapiOptions);
    server.connection();
    server.route([{
        method: 'GET', path: '/', handler: (request, reply) => {

            request.yar.set('some', 'value');
            return reply();
        }
    },
    {
        method: 'GET', path: '/2', handler: (request, reply) => {

            const value = request.yar.get('some');
            return reply(value || '2');
        }
    }]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/' }, (res) => {

                const header = res.headers['set-cookie'];
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);
                const isReadyRestore = cache.prototype.isReady;

                cache.prototype.isReady = () => {

                    return false;
                };

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result).to.equal('value');
                    cache.prototype.isReady = isReadyRestore;
                    done();
                });
            });
        });
    });
});

it('fails generating session cookie header value (missing password)', (done) => {

    const server = new Hapi.Server({ debug: false });
    server.connection();

    server.route({
        method: 'GET', path: '/1', handler: (request, reply) => {

            request.yar.set('some', { value: '2' });
            return reply('1');
        }
    });

    server.register(require('../'), (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });
});

it('sends back a 400 if not ignoring errors on bad session cookie', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false,
            ignoreErrors: false
        }
    };

    const headers = {
        Cookie: 'session=Fe26.2**deadcafe' // bad session value
    };

    const server = new Hapi.Server({ debug: false });
    server.connection();

    server.route({
        method: 'GET', path: '/1', handler: (request, reply) => {

            request.yar.set('some', { value: '2' });
            return reply('1');
        }
    });

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1', headers }, (res) => {

                expect(res.statusCode).to.equal(400);
                done();
            });
        });
    });
});

it('fails to store session because of state error', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const headers = {
        Cookie: 'session=Fe26.2**deadcafe' // bad session value
    };

    const server = new Hapi.Server({ debug: false });
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                return reply(Object.keys(request.yar._store).length);
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1', headers }, (res) => {

                expect(res.result).to.equal(0);
                done();
            });
        });
    });
});

it('ignores requests when session is not set (error)', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();
    server.connection();
    server.route({
        method: 'GET',
        path: '/',
        handler: (request, reply) => {

            reply('ok');
        }
    });

    server.ext('onRequest', (request, reply) => {

        reply(Boom.badRequest('handler error'));
    });

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject('/', (res) => {

                expect(res.statusCode).to.equal(400);
                expect(res.result.message).to.equal('handler error');
                done();
            });
        });
    });
});

it('ignores requests when the skip route config value is true', (done) => {

    const options = {
        cookieOptions: {
            password: internals.password
        }
    };
    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/',
            handler: (request, reply) => {

                return reply('1');
            },
            config: {
                plugins: {
                    yar: {
                        skip: true
                    }
                }
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/' }, (res) => {

                const header = res.headers['set-cookie'];
                expect(header).to.be.undefined();
                done();
            });
        });
    });
});

describe('flash()', () => {

    it('should get all flash messages when given no arguments', (done) => {

        const options = {
            cookieOptions: {
                password: internals.password
            }
        };
        const server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'GET',
            path: '/1',
            config: {
                handler: (request, reply) => {

                    request.yar.flash('error', 'test error 1');
                    request.yar.flash('error', 'test error 2');
                    request.yar.flash('test', 'test 1', true);
                    request.yar.flash('test', 'test 2', true);
                    reply(request.yar._store);
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/2',
            config: {
                handler: (request, reply) => {

                    const flashes = request.yar.flash();
                    reply({
                        yar: request.yar._store,
                        flashes
                    });
                }
            }
        });

        server.register({ register: require('../'), options }, (err) => {

            expect(err).to.not.exist();
            server.start(() => {

                server.inject({ method: 'GET', url: '/1' }, (res) => {

                    expect(res.result._flash.error).to.equal(['test error 1', 'test error 2']);
                    expect(res.result._flash.test).to.equal('test 2');

                    const header = res.headers['set-cookie'];
                    expect(header.length).to.equal(1);
                    const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                        expect(res2.result.yar._flash.error).to.not.exist();
                        expect(res2.result.flashes).to.exist();
                        done();
                    });
                });
            });
        });
    });

    it('should delete on read', (done) => {

        const options = {
            cookieOptions: {
                password: internals.password
            }
        };
        const server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'GET',
            path: '/1',
            config: {
                handler: (request, reply) => {

                    request.yar.flash('error', 'test error');
                    reply(request.yar._store);
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/2',
            config: {
                handler: (request, reply) => {

                    const errors = request.yar.flash('error');
                    const nomsg = request.yar.flash('nomsg');
                    reply({
                        yar: request.yar._store,
                        errors,
                        nomsg
                    });
                }
            }
        });

        server.register({ register: require('../'), options }, (err) => {

            expect(err).to.not.exist();
            server.start(() => {

                server.inject({ method: 'GET', url: '/1' }, (res) => {

                    expect(res.result._flash.error).to.exist();
                    expect(res.result._flash.error.length).to.be.above(0);

                    const header = res.headers['set-cookie'];
                    expect(header.length).to.equal(1);
                    const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                        expect(res2.result.yar._flash.error).to.not.exist();
                        expect(res2.result.errors).to.exist();
                        expect(res2.result.nomsg).to.exist();
                        done();
                    });
                });
            });
        });
    });
});

it('stores blank sessions when storeBlank is not given', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                return reply('heyo!');
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            let stores = 0;

            const fn = server._caches._default.client.set;
            server._caches._default.client.set = function () { // Don't use arrow function here.

                stores++;
                fn.apply(this, arguments);
            };

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(stores).to.equal(1);
                expect(res.headers['set-cookie'].length).to.equal(1);
                done();
            });
        });
    });
});

it('does not store blank sessions when storeBlank is false', (done) => {

    const options = {
        storeBlank: false,
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                return reply('heyo!');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                request.yar.set('hello', 'world');
                return reply('should be set now');
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            let stores = 0;
            const fn = server._caches._default.client.set;
            server._caches._default.client.set = function () { // Don't use arrow function here.

                stores++;
                fn.apply(this, arguments);
            };

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(stores).to.equal(0);
                expect(res.headers['set-cookie']).to.be.undefined();

                server.inject({ method: 'GET', url: '/2' }, (res2) => {

                    expect(stores).to.equal(1);
                    expect(res2.headers['set-cookie'].length).to.equal(1);
                    done();
                });
            });
        });
    });
});

it('allow custom session ID', (done) => {

    let sessionIDExternalMemory = 0;

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        customSessionIDGenerator: () => {

            sessionIDExternalMemory += 1;
            return `custom_id_${sessionIDExternalMemory}`;
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                expect(request.yar.id).to.equal('custom_id_1');
                return reply('custom_id_1');
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                request.yar.reset();
                request.yar.touch();
                expect(request.yar.id).to.equal('custom_id_2');
                return reply('custom_id_2');
            }
        },
        {
            method: 'GET', path: '/still_2', handler: (request, reply) => {

                expect(request.yar.id).to.equal('custom_id_2');
                return reply('custom_id_2');
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.result).to.equal('custom_id_1');
                const header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } }, (res2) => {

                    expect(res2.result).to.equal('custom_id_2');
                    const header2 = res2.headers['set-cookie'];
                    expect(header2.length).to.equal(1);
                    const cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/still_2', headers: { cookie: cookie2[1] } }, (res3) => {

                        expect(res3.result).to.equal('custom_id_2');
                        done();
                    });
                });
            });
        });
    });
});

it('pass the resquest as parameter of customSessionIDGenerator', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        customSessionIDGenerator: (request) => {

            return request.path;
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/request-based-session-id', handler: (request, reply) => {

                expect(request.yar.id).to.equal('/request-based-session-id');
                return reply('ok');
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/request-based-session-id' }, (res) => {

                expect(res.result).to.equal('ok');

                done();
            });
        });
    });
});

it('will set an session ID if no custom session ID generator function is provided', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, reply) => {

                expect(request.yar.id).to.exist();
                return reply(1);
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/1' }, (res) => {

                expect(res.result).to.equal(1);
                const header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                done();

            });
        });
    });
});

it('will throw error if session ID generator function don\'t return a string', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        customSessionIDGenerator: (request) => {

            switch (request.path) {
                case '/null':
                    return null;
                case '/number':
                    return 1;
                case '/object':
                    return {};
                case '/function':
                    return (() => {});
                case '/boolean':
                    return true;
                case '/array':
                    return [];
                case '/undefined':
                    return undefined;
                default:
                    return 'abc';
            }
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/null', handler: (request, reply) => {

                return reply('null');
            }
        },
        {
            method: 'GET', path: '/number', handler: (request, reply) => {

                return reply('number');
            }
        },
        {
            method: 'GET', path: '/object', handler: (request, reply) => {

                return reply('object');
            }
        },
        {
            method: 'GET', path: '/function', handler: (request, reply) => {

                return reply('function');
            }
        },
        {
            method: 'GET', path: '/boolean', handler: (request, reply) => {

                return reply('boolean');
            }
        },
        {
            method: 'GET', path: '/array', handler: (request, reply) => {

                return reply('array');
            }
        },
        {
            method: 'GET', path: '/undefined', handler: (request, reply) => {

                return reply('undefined');
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            const nullID = () => {

                server.inject({ method: 'GET', url: '/null' }, (res) => {});
            };

            const numberID = () => {

                server.inject({ method: 'GET', url: '/number' }, (res) => {});
            };

            const objectID = () => {

                server.inject({ method: 'GET', url: '/object' }, (res) => {});
            };

            const functionID = () => {

                server.inject({ method: 'GET', url: '/function' }, (res) => {});
            };

            const arrayID = () => {

                server.inject({ method: 'GET', url: '/array' }, (res) => {});
            };

            const booleanID = () => {

                server.inject({ method: 'GET', url: '/boolean' }, (res) => {});
            };

            const undefinedID = () => {

                server.inject({ method: 'GET', url: '/undefined' }, (res) => {});
            };

            expect(nullID).to.throw('Session ID should be a string');
            expect(numberID).to.throw('Session ID should be a string');
            expect(objectID).to.throw('Session ID should be a string');
            expect(functionID).to.throw('Session ID should be a string');
            expect(arrayID).to.throw('Session ID should be a string');
            expect(booleanID).to.throw('Session ID should be a string');
            expect(undefinedID).to.throw('Session ID should be a string');

            done();
        });
    });
});

it('will throw error if session ID generator function is defined but not typeof function', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        customSessionIDGenerator: 'notAfunction'
    };

    const server = new Hapi.Server();
    server.connection();

    const register = () => {

        server.register({ register: require('../'), options }, () => {});
    };

    expect(register).to.throw('customSessionIDGenerator should be a function');

    done();
});

it('should allow to revoke specific session on the server side', (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();
    server.connection();

    server.route([
        {
            method: 'GET', path: '/increment', handler: (request, reply) => {

                const value = request.yar.get('value');
                const result = value ? value + 1 : 1;
                request.yar.set('value', result);
                reply({
                    sessionId: request.yar.id,
                    value: result
                });
            }
        }
    ]);

    server.register({ register: require('../'), options }, (err) => {

        expect(err).to.not.exist();
        server.start(() => {

            server.inject({ method: 'GET', url: '/increment' }, (response) => {

                expect(response.result.value).to.equal(1);
                const header = response.headers['set-cookie'];
                const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

                // check error handling
                server.yar.revoke(null).catch((error) => {

                    expect(error).to.exist();

                    // revoke session
                    server.yar.revoke(response.result.sessionId).then(() => {

                        Promise.all([
                            server.inject({ method: 'GET', url: '/increment', headers: { cookie: cookie[1] } }),
                            server.inject({ method: 'GET', url: '/increment', headers: { cookie: cookie[1] } })
                        ]).then((responses) => {

                            expect(responses[0].result.value).to.equal(1);
                            expect(responses[1].result.value).to.equal(2);
                            done();
                        });
                    });

                });

            });
        });
    });
});
