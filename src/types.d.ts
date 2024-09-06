type AllowedValueTypes = string | number | boolean | Date | null | undefined;

interface MyContextOptions<T extends Record<string, AllowedValueTypes>> {
  expiry?: number;
  defaultValues?: T;
  lazy?: boolean;
}
