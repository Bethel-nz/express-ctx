export type AllowedValueTypes =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | Record<string, unknown>;

export interface MyContextOptions<T extends Record<string, AllowedValueTypes>> {
  expiry?: number;
  defaultValues?: T;
  lazy?: boolean;
}
