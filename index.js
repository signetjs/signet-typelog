var signetTypelog = function (registrar) {
    'use strict';

    registrar.set('*', function () { return true; });

    function validateOptionalType(typeDef) {
        return function (value) {
            return typeDef.optional && typeof value === 'undefined';
        };
    }

    function validateType(typeDef) {
        var validateOptional = validateOptionalType(typeDef);
        var typePredicate = typeDef.predicate;

        return function (value) {
            return typePredicate(value, typeDef.subtype) 
                || validateOptional(value);
        };
    }


    function setImmutableProperty(obj, name, value) {
        Object.defineProperty(obj, name, {
            value: value,
            writeable: false
        });
    }

    function buildSubtypeCheck(parentTypeName, parentSubtypeCheck) {
        return function (typeName) {
            return parentTypeName === typeName || parentSubtypeCheck(typeName);
        }
    }

    function buildTypePredicate(parentPredicate, childPredicate) {
        return function (value, options) {
            return parentPredicate(value, []) && childPredicate(value, options);
        }
    }

    function merge(destination, source) {
        return Object
            .keys(source)
            .reduce(function (result, key){
                result[key] = source[key];
                return result
            }, destination);
    }

    function alwaysFalse () { return false; }

    function getSubtypeCheck(predicate) {
        return typeof predicate.isSubtypeOf === 'function'
            ? predicate.isSubtypeOf
            : alwaysFalse;
    }

    function defineSubtypeOf(parentName) {
        var parentPredicate = registrar.get(parentName);
        var parentSubtypeCheck = getSubtypeCheck(parentPredicate);

        return function (childName, childPredicate) {
            var typePredicate = buildTypePredicate(parentPredicate, childPredicate);
            var isSubtypeOfParent = buildSubtypeCheck(parentName, parentSubtypeCheck);

            merge(typePredicate, childPredicate);
            setImmutableProperty(typePredicate, 'parentTypeName', parentName);
            setImmutableProperty(typePredicate, 'isSubtypeOf', isSubtypeOfParent);

            registrar.set(childName, typePredicate);
        };
    }

    function isType(typeName) {
        try {
            return typeof registrar.get(typeName) === 'function';
        } catch (e) {
            return false;
        }
    }

    function isSubtypeOfBuilder(parentName) {
        return memoize(function (childName) {
            var subtypeCheck = registrar.get(childName).isSubtypeOf;
            return subtypeCheck(parentName);
        });
    }

    var isSubtypeOf = memoize(isSubtypeOfBuilder);

    function memoize(action) {
        var memoStore = {};

        return function (value) {
            var key = JSON.stringify(value);

            if(typeof memoStore[key] === 'undefined') {
                memoStore[key] = action(value);
            }

            return memoStore[key];
        }
    }

    function isTypeOfFactory(typeDef) {
        var processedTypeDef = preprocessSubtypeData(typeDef);
        
        return function (value) {
            return validateType(processedTypeDef)(value);
        };
    }

    var isTypeOf = memoize(isTypeOfFactory);

    function identity(value) {
        return value;
    }

    function preprocessSubtypeData(typeDef) {
        var predicate = registrar.get(typeDef.type);
        var preprocess = typeof predicate.preprocess === 'function' ? predicate.preprocess : identity;
        var typeDefClone = merge({}, typeDef);

        typeDefClone.subtype = preprocess(typeDef.subtype);
        typeDefClone.predicate = predicate;

        return typeDefClone;
    }

    function getTypeChain(typeName) {
        var predicate = registrar.get(typeName);

        return predicate.parentTypeName !== undefined
            ? getTypeChain(predicate.parentTypeName) + ' -> ' + typeName
            : typeName;
    }

    function defineDependentOperatorOn(typeName) {
        var typePred = registrar.get(typeName);

        return function (operator, operation) {
            var operatorDef = {
                operator: operator,
                operation: operation
            };

            setImmutableProperty(typePred, operator, operatorDef);
        }
    }

    function getDependentOperatorOn(typeName) {
        return function (operator) {
            var typePred = registrar.get(typeName);

            if (typeof typePred[operator] === 'object') {
                return typePred[operator];
            } else if (typeName == '*') {
                return null;
            } else {
                return getDependentOperatorOn(typePred.parentTypeName)(operator);
            }
        }
    }

    return {
        define: defineSubtypeOf('*'),
        defineDependentOperatorOn: defineDependentOperatorOn,
        defineSubtypeOf: defineSubtypeOf,
        getDependentOperatorOn: getDependentOperatorOn,
        getTypeChain: getTypeChain,
        isType: isType,
        isTypeOf: isTypeOf,
        isSubtypeOf: isSubtypeOf
    };
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = signetTypelog;
}