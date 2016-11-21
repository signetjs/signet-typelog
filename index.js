var signetTypelog = function (registrar, parser) {
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
            var predicate = registrar.get(childName);

            if (typeof predicate.parentTypeName === 'undefined') {
                return false;
            } else if (predicate.parentTypeName === parentName) {
                return true;
            } else {
                return isSubtypeOf(parentName)(predicate.parentTypeName);
            }
        };
    }

    function isTypeOf(typeDef) {
        return function (value) {
            var predicate = registrar.get(typeDef.type);

            if (typeof predicate.parentTypeName === 'undefined') {
                return true;
            } else {
                var isDeepType = isTypeOf(parser.parseType(predicate.parentTypeName))(value);
                return isDeepType && validateType(typeDef)(value);
            }
        };
    }

    return {
        define: defineSubtypeOf('*'),
        defineSubtypeOf: defineSubtypeOf,
        isType: isType,
        isTypeOf: isTypeOf,
        isSubtypeOf: isSubtypeOf
    };
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = signetTypelog;
}