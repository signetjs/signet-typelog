var assert = require('chai').assert;
var signetRegistrar = require('signet-registrar');
var signetParser = require('signet-parser');

var signetTypelog = require('../index');

describe('Signet Type Logic System (Typelog)', function () {

    var typelog;
    var parser;

    function alwaysTrue() {
        return function () {
            return true;
        };
    }

    function isType (typeStr) {
        return function (value) {
            return typeof value === typeStr;
        };
    }

    beforeEach(function () {
        var registrar = signetRegistrar();
        parser = signetParser();
        typelog = signetTypelog(registrar, parser);
    });

    it('should self-register a base * type', function () {
        var isType = typelog.isType('*');
        assert.equal(isType, true);
    });

    it('should return false with a bad type', function () {
        var isType = typelog.isType('badType');
        assert.equal(isType, false);
    });

    it('should return true on a newly defined type', function () {
        typelog.define('number', alwaysTrue());

        var isType = typelog.isType('number');
        assert.equal(isType, true);
    });

    it('should return true on a subtype check', function () {
        typelog.define('number', alwaysTrue());

        var isSubtype = typelog.isSubtypeOf('*')('number');
        assert.equal(isSubtype, true);
    });

    it('should return false on a check from unrelated non-base type to non-base type', function () {
        typelog.define('number', alwaysTrue());
        typelog.define('string', alwaysTrue());

        var isSubtype = typelog.isSubtypeOf('number')('string');
        assert.equal(isSubtype, false);
    });

    it('should return true on a check between related non-base types', function () {
        typelog.define('number', alwaysTrue());
        typelog.defineSubtypeOf('number')('int', alwaysTrue());

        var isSubtype = typelog.isSubtypeOf('number')('int');
        assert.equal(isSubtype, true);
    });

    it('should return true on a check between nested type and *', function () {
        typelog.define('number', alwaysTrue());
        typelog.defineSubtypeOf('number')('int', alwaysTrue());

        var isSubtype = typelog.isSubtypeOf('*')('int');
        assert.equal(isSubtype, true);
    });

    it('should check a * type', function () {
        var result = typelog.isTypeOf(parser.parseType('*'))('foo');

        assert.equal(result, true);
    });

    it('should return false on type check failure', function () {
        typelog.define('number', function (value) { return typeof value === 'number'; });

        var result = typelog.isTypeOf(parser.parseType('number'))('foo');

        assert.equal(result, false);
    });

    it('should return false on a nested type check failure', function () {
        typelog.define('string', function (value) { return typeof value === 'string'; });
        typelog.defineSubtypeOf('string')('numberString', function (value) { return value.match(/^\d+$/) !== null; });

        var result = typelog.isTypeOf(parser.parseType('numberString'))(10);

        assert.equal(result, false);
    });

    it('should return true on a nested type check failure', function () {
        typelog.define('string', function (value) { return typeof value === 'string'; });
        typelog.defineSubtypeOf('string')('numberString', function (value) { return value.match(/^\d+$/) !== null; });

        var result = typelog.isTypeOf(parser.parseType('numberString'))('10');

        assert.equal(result, true);
    });

    it('should return correct type chains', function () {
        typelog.define('number', isType('number'));
        typelog.define('object', isType('object'));
        typelog.defineSubtypeOf('object')('array', function (value) {
            return Object.prototype.toString.call(value) === '[object Array]';
        });

        assert.equal(typelog.getTypeChain('array'), '* -> object -> array');
        assert.equal(typelog.getTypeChain('number'), '* -> number');
    });

    it('should allow operators to be set on a type', function () {
        function isLesser (a, b) {
            return a < b;
        };

        typelog.define('number', isType('number'));
        typelog.defineDependentOperatorOn('number')('<', isLesser);

        var operatorDef = typelog.getDependentOperatorOn('number')('<');

        assert.equal(operatorDef.operator, '<');
        assert.equal(operatorDef.operation, isLesser);
    });

    it('should find operator on a parent type', function () {
        function isLesser (a, b) {
            return a < b;
        };

        typelog.define('number', isType('number'));
        typelog.defineDependentOperatorOn('number')('<', isLesser);
        typelog.defineSubtypeOf('number')('int', function (value) { return Math.floor(value) === value; });

        var operatorDef = typelog.getDependentOperatorOn('int')('<');

        assert.equal(operatorDef.operator, '<');
        assert.equal(operatorDef.operation, isLesser);
    });

});