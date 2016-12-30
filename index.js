var signetTypelog = function (registrar, parser) {
    'use strict';

    registrar.set('*', function () { return true; });

    function validateOptionalType(typeDef) {
        return function (value) {
            return typeDef.optional && typeof value === 'undefined';
        };
    }

    function validateType(typeDef) {
        var validateOptional = validateOptionalType(typeDef);

        return function (value) {
            return registrar.get(typeDef.type)(value, typeDef.subtype) || validateOptional(value);
        };
    }


    function setImmutableProperty(obj, name, value) {
        Object.defineProperty(obj, name, {
            value: value,
            writeable: false
        });
    }

    function defineSubtypeOf(parentName) {
        return function (childName, predicate) {
            setImmutableProperty(predicate, 'parentTypeName', parentName);
            registrar.set(childName, predicate);
        };
    }

    function isType(typeName) {
        return typeof registrar.get(typeName) === 'function';
    }

    function isSubtypeOf(parentName) {
        return function (childName) {
            var parentTypeName = registrar.get(childName).parentTypeName;

            var hasNoParent = typeof parentTypeName === 'undefined';
            var isParentMatch = parentTypeName === parentName;

            return hasNoParent || isParentMatch ? isParentMatch : isSubtypeOf(parentName)(parentTypeName);
        };
    }

    function isTypeOf(typeDef) {
        var processedTypeDef = preprocessSubtypeData(typeDef);

        return function (value) {
            var predicate = registrar.get(typeDef.type);
            var parentType = predicate.parentTypeName;
            var isDone = typeof parentType !== 'undefined';

            return isDone ? verifyType(processedTypeDef, parentType, value) : true;
        };
    }

    function identity(value) {
        return value;
    }

    function preprocessSubtypeData(typeDef) {
        var predicate = registrar.get(typeDef.type);
        var preprocess = typeof predicate.preprocess === 'function' ? predicate.preprocess : identity;

        return {
            name: typeDef.name,
            type: typeDef.type,
            subtype: preprocess(typeDef.subtype),
            originalSubtype: typeDef.subtype,
            optional: typeDef.optional
        };
    }

    function verifyType(typeDef, parentType, value) {
        var parentTypeDef = parser.parseType(parentType);
        parentTypeDef.subtype.concat(typeDef.originalSubtype);

        return isTypeOf(parentTypeDef)(value) && validateType(typeDef)(value);

    }

    function getTypeChain(typeName) {
        var predicate = registrar.get(typeName);

        return predicate.parentTypeName !== undefined ?
            getTypeChain(predicate.parentTypeName) + ' -> ' + typeName :
            typeName;
    }


    return {
        define: defineSubtypeOf('*'),
        defineSubtypeOf: defineSubtypeOf,
        getTypeChain: getTypeChain,
        isType: isType,
        isTypeOf: isTypeOf,
        isSubtypeOf: isSubtypeOf
    };
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = signetTypelog;
}