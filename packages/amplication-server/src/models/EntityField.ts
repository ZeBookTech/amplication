import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { JsonValue } from 'type-fest';
import { EntityVersion } from './EntityVersion';
import { EnumDataType } from './../enums/EnumDataType';

@ObjectType({
  isAbstract: true,
  description: undefined
})
export class EntityField {
  @Field(() => String, {
    nullable: false,
    description: undefined
  })
  id!: string;

  @Field(() => Date, {
    nullable: false,
    description: undefined
  })
  createdAt!: Date;

  @Field(() => Date, {
    nullable: false,
    description: undefined
  })
  updatedAt!: Date;

  entityVersion?: EntityVersion;

  @Field(() => String, {
    nullable: false,
    description: undefined
  })
  name!: string;

  @Field(() => String, {
    nullable: false,
    description: undefined
  })
  displayName!: string;

  @Field(() => EnumDataType, {
    nullable: false,
    description: undefined
  })
  dataType!: keyof typeof EnumDataType;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: undefined
  })
  properties!: JsonValue;

  @Field(() => Boolean, {
    nullable: false,
    description: undefined
  })
  required!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: undefined
  })
  searchable!: boolean;

  @Field(() => String, {
    nullable: false,
    description: undefined
  })
  description!: string;
}
