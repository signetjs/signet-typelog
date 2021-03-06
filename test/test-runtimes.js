var runner = require('./test-timer/runner');
var registrar = require('signet-registrar')();
var parser = require('signet-parser')();
var typelog = require('../index.js')(registrar, parser);

(function () {
    'use strict';
    
    function isNumber (value) {
        return typeof value === 'number';
    }

    function isInt (value) {
        return Math.floor(value) === value;
    }

    function isNatural (value) {
        return !(value < 0);
    }

    typelog.define('number', isNumber);
    typelog.defineSubtypeOf('number')('int', isInt);
    typelog.defineSubtypeOf('int')('natural', isNatural);

    var time;

    var isAnyType = typelog.isTypeOf(parser.parseType('*'));
    var isNumberType = typelog.isTypeOf(parser.parseType('number'));
    var isNaturalType = typelog.isTypeOf(parser.parseType('natural'));
    var isOptionalType = typelog.isTypeOf(parser.parseType('[natural]'));

    time = runner(function () { return isAnyType('foo'); });
    console.log('Is any type runtime: ', time);

    time = runner(function () { return isNumberType(1.123); });
    console.log('Is number type runtime: ', time);

    time = runner(function () { return isNaturalType(5); });
    console.log('Is natural type runtime: ', time);

    time = runner(function () { return isOptionalType(7); });
    console.log('Is optional type runtime: ', time);

})();