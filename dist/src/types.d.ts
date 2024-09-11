export type AllowedValueTypes = baseType | AllowedObject | AllowedValueTypes[];
export type baseType = string | number | boolean | Date | null | any;
export type AllowedObject = Record<string, baseType>;
export type AllowedValueTypesRecord = Record<string, AllowedValueTypes>;
export type ContextMiddlewareOptions = Record<string, AllowedValueTypes>;
export type InferedContext<T extends Record<string, AllowedValueTypes>> = {
    [K in keyof T]: T[K];
};
