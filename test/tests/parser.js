'use strict';

var url = require('url');

var expect = require('chai').expect;

var eol = '\n';
var Parser = require('../../src/parser');

describe('Parser', function () {

    var parser;

    beforeEach(function () {
        parser = new Parser({
            eol: eol
        });
    });

    context('When parsing request line', function () {
        var requests = [
            {
                description: 'No method, URI',
                request: 'http://localhost/dogs',
                method: 'GET',
                protocol: 'http:',
                auth: null,
                host: 'localhost',
                hostname: 'localhost',
                port: null,
                path: '/dogs'
            },
            {
                description: 'No method, URI with port',
                request: 'http://localhost:8080/dogs?name=bear',
                method: 'GET',
                protocol: 'http:',
                auth: null,
                host: 'localhost:8080',
                hostname: 'localhost',
                port: '8080',
                path: '/dogs?name=bear'
            },
            {
                description: 'Method, path only',
                request: 'POST /cats',
                method: 'POST',
                protocol: null,
                auth: null,
                host: null,
                hostname: null,
                port: null,
                path: '/cats'
            },
            {
                description: 'Blank lines at start',
                request: ['', '   ', 'PUT /hamsters'].join(eol),
                method: 'PUT',
                protocol: null,
                auth: null,
                host: null,
                hostname: null,
                port: null,
                path: '/hamsters'
            },
            {
                description: 'Method, path, and version',
                request: 'OPTIONS /guinea-pigs HTTP/1.1',
                method: 'OPTIONS',
                protocol: null,
                auth: null,
                host: null,
                hostname: null,
                port: null,
                path: '/guinea-pigs'
            },
            {
                description: 'Authority',
                request: 'DELETE https://fry:secret@mydomain.com/cats',
                method: 'DELETE',
                protocol: 'https:',
                auth: 'fry:secret',
                host: 'mydomain.com',
                hostname: 'mydomain.com',
                port: null,
                path: '/cats'
            }
        ];
        describe('Parses method', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.method).to.equal(test.method);
                });
            });
        });
        describe('Parses protocol', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.protocol).to.equal(test.protocol);
                });
            });
        });
        describe('Parses auth', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.auth).to.equal(test.auth);
                });
            });
        });
        describe('Parses host', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.host).to.equal(test.host);
                });
            });
        });
        describe('Parses hostname', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.hostname).to.equal(test.hostname);
                });
            });
        });
        describe('Parses port', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.port).to.equal(test.port);
                });
            });
        });
        describe('Parses path', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.path).to.equal(test.path);
                });
            });
        });
    });

    context('When parsing headers, query, and options', function () {
        var request = [
            'POST http://mydomain.com/cats?cat=molly&dog=bear',
            '?cat=oscar',
            ' & hamster : Fizzgig',
            '?guineaPigs=Clyde and Claude',
            '&query',
            'Host: localhost',
            'Cache-control: no-cache',
            'Content-type: application/json',
            '  # This is a pound-comment: not a header',
            '  // This is a slash-comment= not a header',
            'Incomplete-header',
            '@flag',
            '@followRedirects: true',
            '@redirectStatusCodes: [301, 302]',
            '@redirectLimit: 5',
            '@stringOption: "stringValue"',
            '@unquotedStringOption: stringValue=2',
            '',
            '{\'name\': \'molly\'}',
            ''
        ].join(eol);

        describe('Parses headers', function () {
            it('Parses header with key and value', function () {
                var expectedHeaders = {
                        'Host': 'localhost',
                        'Cache-control': 'no-cache',
                        'Content-type': 'application/json'
                    },
                    headers = Object.keys(expectedHeaders),
                    result = parser.parse(request),
                    header, i, u;
                for (i = 0, u = headers.length; i < u; ++i) {
                    header = headers[i];
                    expect(result.options.headers[header]).to.equal(expectedHeaders[header]);
                }
            });
            it('Does not parses header without :', function () {
                var result = parser.parse(request);
                expect(result.options.headers['Incomplete-header']).not.to.be.defined;
            });
        });

        describe('Parses query', function () {
            it('Does not replace parameters in request line not overridden later', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.dog).to.equal('bear');
            });
            it('Replaces parameters with overrides', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.cat).to.equal('oscar');
            });
            it('Parses parameters starting with ?', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.cat).to.equal('oscar');
            });
            it('Parses parameters starting with &', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.hamster).to.equal('Fizzgig');
            });
            it('Parses parameters separated with =', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.cat).to.equal('oscar');
            });
            it('Parses parameters separated with :', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.hamster).to.equal('Fizzgig');
            });
            it('Parses parameters with no values', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.query).to.equal('');
            });
        });

        describe('Parses configuration', function () {
            it('Parses flag options', function () {
                var result = parser.parse(request);
                expect(result.configuration.flag).to.be.a('boolean');
                expect(result.configuration.flag).to.equal(true);
            });
            it('Parses boolean options', function () {
                var result = parser.parse(request);
                expect(result.configuration.followRedirects).to.be.a('boolean');
                expect(result.configuration.followRedirects).to.equal(true);
            });
            it('Parses number options', function () {
                var result = parser.parse(request);
                expect(result.configuration.redirectLimit).to.be.a('number');
                expect(result.configuration.redirectLimit).to.equal(5);
            });
            it('Parses array options', function () {
                var result = parser.parse(request);
                expect(result.configuration.redirectStatusCodes).to.be.a('array');
                expect(result.configuration.redirectStatusCodes).to.have.length(2);
                expect(result.configuration.redirectStatusCodes).to.include(301);
                expect(result.configuration.redirectStatusCodes).to.include(302);
            });
            it('Parses string options with quotes', function () {
                var result = parser.parse(request);
                expect(result.configuration.stringOption).to.be.a('string');
                expect(result.configuration.stringOption).to.equal('stringValue');
            });
            it('Parses string options without quotes', function () {
                var result = parser.parse(request);
                expect(result.configuration.unquotedStringOption).to.be.a('string');
                expect(result.configuration.unquotedStringOption).to.equal('stringValue=2');
            });
        });

        describe('Comments', function () {
            it('Skips lines beginning with #', function () {
                var result = parser.parse(request);
                expect(result.options.toString()).to.not.contain('pound-comment');
            });
            it('Skips lines beginning with //', function () {
                var result = parser.parse(request);
                expect(result.options.toString()).to.not.contain('slash-comment');
            });
        });

        describe('URI', function () {
            var result;
            beforeEach(function () {
                result = {};
            });
            describe('Normalizes protocol', function () {
                function parseWithProtocol(protocol) {
                    return parser.parse([
                        'GET /',
                        '@protocol: ' + protocol
                    ].join(eol));
                }
                it('Normalizes "http" to "http:"', function () {
                    result = parseWithProtocol('http');
                    expect(result.options.protocol).to.equal('http:');
                });
                it('Normalizes "https" to "https:"', function () {
                    result = parseWithProtocol('https');
                    expect(result.options.protocol).to.equal('https:');
                });
                it('Normalizes invalid protocol to "http:"', function () {
                    result = parseWithProtocol('gopher');
                    expect(result.options.protocol).to.equal('http:');
                });
            });
            context('When the request line specifies a host', function () {
                context('And request does not contains options or a Host header', function () {
                    beforeEach(function () {
                        result = parser.parse('GET http://myhost.com');
                    });
                    it('Uses URI parsed from request line', function () {
                        expect(result.options.protocol).to.equal('http:');
                        expect(result.options.host).to.equal('myhost.com');
                        expect(result.options.port).to.be.null;
                    });
                    it('Does not supply a host header', function () {
                        expect(result.options.headers.Host).not.to.be.defined;
                    });
                });
                context('And request contains options but no Host header', function () {
                    beforeEach(function () {
                        result = parser.parse([
                            'GET http://myhost.com',
                            '@protocol: https',
                            '@host: yourhost.com',
                            '@port: 8080',
                            '@auth: rufus:secret'
                        ].join(eol));
                    });
                    it('Uses URI parsed from request line', function () {
                        expect(result.options.protocol).to.equal('https:');
                        expect(result.options.host).to.equal('yourhost.com');
                        expect(result.options.port).to.equal(8080);
                        expect(result.options.auth).to.equal('rufus:secret');
                    });
                    it('Does not supply a Host header', function () {
                        expect(result.options.headers.Host).not.to.be.defined;
                    });
                });
                context('And request contains Host header', function () {
                    beforeEach(function () {
                        result = parser.parse([
                            'GET http://myhost.com',
                            'Host: yourdomain.com'
                        ].join(eol));
                    });
                    it('Uses URI parsed from request line', function () {
                        expect(result.options.protocol).to.equal('http:');
                        expect(result.options.host).to.equal('myhost.com');
                        expect(result.options.port).to.be.null;
                    });
                    it('Includes provided Host header', function () {
                        expect(result.options.headers.Host).to.equal('yourdomain.com');
                    });
                });
            });
            context('When the request line does not specify a host', function () {
                context('And request does not contains options or a Host header', function () {
                    beforeEach(function () {
                        result = parser.parse('GET / HTTP/1.1');
                    });
                    it('Does not provide a URI', function () {
                        expect(result.options.protocol).to.be.null;
                        expect(result.options.host).to.be.null;
                        expect(result.options.port).to.be.null;
                    });
                    it('Does not supply a host header', function () {
                        expect(result.options.headers.Host).not.to.be.defined;
                    });
                });
                context('And request contains options but no Host header', function () {
                    beforeEach(function () {
                        result = parser.parse([
                            'GET / HTTP/1.1',
                            '@protocol: https',
                            '@host: yourhost.com',
                            '@port: 8080',
                            '@auth: rufus:secret'
                        ].join(eol));
                    });
                    it('Uses URI parsed from request line', function () {
                        expect(result.options.protocol).to.equal('https:');
                        expect(result.options.host).to.equal('yourhost.com');
                        expect(result.options.port).to.equal(8080);
                        expect(result.options.auth).to.equal('rufus:secret');
                    });
                    it('Does not supply a Host header', function () {
                        expect(result.options.headers.Host).not.to.be.defined;
                    });
                });
                context('And request contains Host header', function () {
                    context('With a port', function () {
                        beforeEach(function () {
                            result = parser.parse([
                                'GET / HTTP/1.1',
                                'host: yourdomain.com:9090'
                            ].join(eol));
                        });
                        it('Uses URI parsed from Host header', function () {
                            expect(result.options.protocol).not.to.be.defined;
                            expect(result.options.host).to.equal('yourdomain.com');
                            expect(result.options.port).to.equal(9090);
                        });
                        it('Includes provided Host header', function () {
                            expect(result.options.headers.host).to.equal('yourdomain.com:9090');
                        });
                    });
                    context('Without a port', function () {
                        beforeEach(function () {
                            result = parser.parse([
                                'GET / HTTP/1.1',
                                'host: yourdomain.com'
                            ].join(eol));
                        });
                        it('Uses URI parsed from Host header', function () {
                            expect(result.options.protocol).not.to.be.defined;
                            expect(result.options.host).to.equal('yourdomain.com');
                            expect(result.options.port).not.to.be.defined;
                        });
                        it('Includes provided Host header', function () {
                            expect(result.options.headers.host).to.equal('yourdomain.com');
                        });
                    });
                });
            });
        });
    });

    context('When parsing body', function () {
        context('With body', function () {
            var result;
            beforeEach(function () {
                var request = [
                    'POST http://mydomain.com/cats',
                    'Host: localhost',
                    'Content-type: application/json',
                    '',
                    '{"name": "molly"}'
                ].join(eol);
                result = parser.parse(request);
            });
            it('Provides body as string', function () {
                expect(result.body).to.equal('{"name": "molly"}');
            });
            it('Adds content-length header', function () {
                expect(result.options.headers['Content-length']).to.equal('17');
            });
        });
        context('With body and explicit Content-length header', function () {
            var result;
            beforeEach(function () {
                var request = [
                    'POST http://mydomain.com/cats',
                    'Host: localhost',
                    'Content-type: application/json',
                    'Content-length: 5',
                    '',
                    '{"name": "molly"}'
                ].join(eol);
                result = parser.parse(request);
            });
            it('Provides body as string', function () {
                expect(result.body).to.equal('{"name": "molly"}');
            });
            it('Does not replace content-length header', function () {
                expect(result.options.headers['Content-length']).to.equal('5');
            });
        });
        context('Without body', function () {
            var result;
            beforeEach(function () {
                var request = [
                    'GET http://mydomain.com/cats',
                    'Host: localhost',
                    'Content-type: application/json',
                    '',
                    '',
                    ''
                ].join(eol);
                result = parser.parse(request);
            });

            it('Body is undefined when no body is present', function () {
                expect(result.body).to.be.undefined;
            });
            it('No content-length header is added when no body is present', function () {
                var headers = Object.keys(result.options.headers),
                    countHeaders = 0, header, i, u;
                for (i = 0, u = headers.length; i < u; ++i) {
                    header = headers[i];
                    if (header.toLowerCase() === 'content-length') {
                        ++countHeaders;
                    }
                }
                expect(countHeaders).to.equal(0);
            });
        });

        // ---------------------------------------------------------------------

        describe('Forms', function () {
            var result;
            beforeEach(function () {
                var request = [
                    'POST http://mydomain.com/cats',
                    'Host: localhost',
                    '@form',
                    '',
                    'cat=molly',
                    ' dog: bear',
                    'guineaPigs: Clyde and Claude',
                    'noField',
                    '  # comment: Ignore this pound-comment',
                    '  // comment: Ignore this slash-comment',
                    '    quoted = """This is the value""" This is ignored.',
                    'comments: """Dear Life Cereal, Where do you get off?',
                    'Part of a balanced breakfast and delicious? Who do you think',
                    'you are? By now, you may have guessed I\'m speaking',
                    'ironically and have nothing but good things to say about what',
                    'you do. Life Cereal, do not change a thing. Signed: Peter',
                    'Griffin. Dictated but not read."""'
                ].join(eol);
                result = parser.parse(request);
            });

            it('Adds Content-type header when @form option is true', function () {
                expect(result.options.headers['Content-type'].toLowerCase())
                    .to.equal('application/x-www-form-urlencoded');
            });

            describe('Encodes form fields when @form option is true', function () {
                it('Uses = separator', function () {
                    expect(result.body).to.contain('cat=molly');
                });
                it('Uses : separator', function () {
                    expect(result.body).to.contain('dog=bear');
                });
                it('Skips fields without = or :', function () {
                    expect(result.body).not.to.contains('noField');
                });
                it('Percent encodes values', function () {
                    expect(result.body).to.contain('guineaPigs=Clyde%20and%20Claude');
                });
                it('Percent encodes values', function () {
                    expect(result.body).to.contain('guineaPigs=Clyde%20and%20Claude');
                });
                it('Parses values inside multiline field delimiters', function () {
                    expect(result.body).to.contain('quoted=This%20is%20the%20value');
                });
                it('Parses multi-line fields values', function () {
                    var expected = [
                            'Dear Life Cereal, Where do you get off?',
                            'Part of a balanced breakfast and delicious? Who do you think',
                            'you are? By now, you may have guessed I\'m speaking',
                            'ironically and have nothing but good things to say about what',
                            'you do. Life Cereal, do not change a thing. Signed: Peter',
                            'Griffin. Dictated but not read.'
                        ].join(eol);
                    expected = 'comments=' + encodeURIComponent(expected);
                    expect(result.body).to.contain(expected);
                });
            });
            describe('Comments', function () {
                it('Skips lines beginning with #', function () {
                    expect(result.body).to.not.contain('pound-comment');
                });
                it('Skips lines beginning with //', function () {
                    expect(result.body).to.not.contain('slash-comment');
                });
            });
        });
    });

    describe('Configuration', function () {
        function getRequest(eol) {
            return [
                'GET /path',
                'Host: myhost.com',
                '',
                'Request body'
            ].join(eol);
        }
        function getFormRequest(eol, start, end) {
            return [
                'GET /path',
                'Host: myhost.com',
                '@form',
                '',
                'single: ' + start + 'Single' + end,
                'multi: ' + start + 'Multiline',
                'field' + end
            ].join(eol);
        }
        context('When user does not provide configuration', function () {
            var eol = '\n';
            var start = '"""';
            var end = '""""';
            var parser;
            beforeEach(function() {
                parser = new Parser();
            });
            it('Parses with default eol indicator', function () {
                var result = parser.parse(getRequest(eol));
                expect(result.body).to.equal('Request body');
            });
            it('Parses with default multiline form quotes (single line)', function () {
                var result = parser.parse(getFormRequest(eol, start, end));
                var form = 'single=Single';
                expect(result.body).to.contain(form);
            });
            it('Parses with default multiline form quotes (multiple lines)', function () {
                var result = parser.parse(getFormRequest(eol, start, end));
                var value = 'Multiline' + eol + 'field';
                var form = 'multi=' + encodeURIComponent(value);
                expect(result.body).to.contain(form);
            });
        });
        context('When user provides configuration', function () {
            var eol = '\r\n';
            var start = '<<<<<';
            var end = '>>>>>';
            var parser;
            beforeEach(function() {
                parser = new Parser({
                    eol: eol,
                    multilineStart: start,
                    multilineEnd: end
                });
            });
            it('Parses with custom eol character', function () {
                var result = parser.parse(getRequest(eol));
                expect(result.body).to.equal('Request body');
            });
            it('Parses with default multiline form quotes (single line)', function () {
                var result = parser.parse(getFormRequest(eol, start, end));
                var form = 'single=Single';
                expect(result.body).to.contain(form);
            });
            it('Parses with default multiline form quotes', function () {
                var result = parser.parse(getFormRequest(eol, start, end));
                var value = 'Multiline' + eol + 'field';
                var form = 'multi=' + encodeURIComponent(value);
                expect(result.body).to.contain(form);
            });
        });
    });

});