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

    function isSubtypeOfFactory(parentTypeName, parentSubtypeCheck) {
        var cleanSubtypeCheck = typeof parentSubtypeCheck === 'function'
            ? parentSubtypeCheck
            : function () { return false; };

        return function (typeName) {
            return parentTypeName === typeName || cleanSubtypeCheck(typeName);
        }
    }

    function buildTypePredicate(parentPredicate, childPredicate) {
        return function (value, options) {
            return parentPredicate(value, []) && childPredicate(value, options);
        }
    }

    function mergeProps(typePredicate, childPredicate) {
        return Object
            .keys(childPredicate)
            .reduce(function (resultPredicate, key) {
                resultPredicate[key] = childPredicate[key];
                return resultPredicate;
            }, typePredicate);
    }

    function defineSubtypeOf(parentName) {
        var parentPredicate = registrar.get(parentName);
        var parentSubtypeCheck = parentPredicate.isSubtypeOf;

        return function (childName, childPredicate) {
            var isSubtypeOfType = isSubtypeOfFactory(parentName, parentSubtypeCheck);
            var typePredicate = buildTypePredicate(parentPredicate, childPredicate);

            mergeProps(typePredicate, childPredicate);
            setImmutableProperty(typePredicate, 'parentTypeName', parentName);
            setImmutableProperty(typePredicate, 'isSubtypeOf', isSubtypeOfType);

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

    function isSubtypeOf(parentName) {
        return function (childName) {
            var subtypeCheck = registrar.get(childName).isSubtypeOf;
            return subtypeCheck(parentName);
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