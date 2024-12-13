import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { IsAssetValidService } from './is-asset-valid.service';

@ValidatorConstraint({ name: 'isAssetValid', async: true })
@Injectable()
export class IsAssetValidConstraint implements ValidatorConstraintInterface {
  constructor(private readonly isAssetValidService: IsAssetValidService) {}

  async validate(asset: string): Promise<boolean> {
    if (!this.isAssetValidService) {
      throw new InternalServerErrorException('Validation service not injected');
    }
    return this.isAssetValidService.findAssetName(asset);
  }

  defaultMessage(): string {
    return 'Asset ($value) does not exist in the database';
  }
}

export function isAssetValid(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isAssetValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsAssetValidConstraint,
    });
  };
}
