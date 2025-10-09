import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validateur de mot de passe fort
 * 
 * Conformité ANSSI / OWASP :
 * - Minimum 12 caractères
 * - Au moins une majuscule
 * - Au moins une minuscule
 * - Au moins un chiffre
 * - Au moins un caractère spécial (@$!%*?&)
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Regex : minimum 12 caractères, au moins une majuscule, une minuscule, un chiffre et un caractère spécial
          const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
          return regex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)';
        }
      }
    });
  };
}

