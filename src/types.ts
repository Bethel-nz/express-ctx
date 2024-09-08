export type AllowedValueTypes = baseType | AllowedObject | AllowedValueTypes[];

//eslint-disable-next-line
export type baseType = string | number | boolean | Date | null | any;

export type AllowedObject = Record<string, baseType>;

export type AllowedValueTypesRecord = Record<string, AllowedValueTypes>;

export interface MyContextOptions<T extends AllowedValueTypesRecord> {
  expiry?: number;
  defaultValues?: T;
}
