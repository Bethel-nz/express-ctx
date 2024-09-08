export type AllowedValueTypes =
  | string
  | number
  | boolean
  | Date
  | null
  | AllowdObject;

interface AllowdObject {
  [key: string]: AllowedValueTypes;
}

export interface MyContextOptions<T extends Record<string, AllowedValueTypes>> {
  expiry?: number;
  defaultValues?: T;
  lazy?: boolean;
}
