import { omit, pick } from 'es-toolkit'

/**
 * This utility function, `createFixture`, generates a factory function for creating test data fixtures. It is designed to support
 * both static and dynamic test data generation with an emphasis on customization through custom options and per-call overrides.
 * The utility offers three modes of operation to accommodate various use cases: without custom options, with static custom
 * options, and with dynamic custom options provided via a getter function.
 *
 * Modes of Operation:
 * 1. **Without Custom Options**: For simple data generation that does not require custom options.
 * 2. **With Static Custom Options**: Allows specifying a static object of custom options to influence the data generation logic.
 * 3. **With Dynamic Custom Options**: Utilizes a getter function to provide dynamic default options, offering more flexibility.
 *
 * The returned factory function takes a `getValues` function, responsible for generating the base structure of the fixture.
 * This function can optionally use the provided custom options. An `overrides` object can also be passed to the factory function
 * for per-call customizations, allowing modification of both the initial custom options and the properties of the generated data.
 *
 * @typeparam T - The base type of the data generated by the fixture.
 * @typeparam P - The type of the custom options object, optional.
 * @param defaultOptionsOrGetter - An optional object of custom options or a function returning such an object.
 * These options are used within the `getValues` function to dynamically generate data.
 *
 * @returns A factory function that accepts a `getValues` function for generating the fixture's base data.
 * The factory function can be further invoked with an `overrides` object to customize the generated data per call.
 *
 * @example
 * Without custom options:
 * ```typescript
 * export const user = createFixture<User>()(() => ({
 *   id: faker.datatype.uuid(),
 *   name: faker.name.findName(),
 * }));
 * ```
 *
 * With custom options influencing data generation (not directly included in the output):
 * ```typescript
 * export const complexUserData = createFixture<User, { isActive: boolean }>({
 *   isActive: true,
 * })(({ isActive }) => ({
 *   id: faker.datatype.uuid(),
 *   name: faker.name.findName(),
 *   status: isActive ? 'active' : 'inactive',
 *   lastLogin: isActive ? new Date() : undefined,
 * }));
 * ```
 *
 * With dynamic custom options for flexible and context-specific data generation:
 * ```typescript
 * export const token = createFixture<Token, { sdkToken: SDKToken }>(() => ({
 *   sdkToken: randomChoice(TOKENS),
 * }))(({ sdkToken }) => ({
 *   ...contract(),
 *   id: faker.datatype.uuid(),
 *   name: sdkToken.name,
 *   symbol: sdkToken.symbol,
 *   decimals: sdkToken.decimals,
 *   chain: toGraphQLChain(sdkToken.chainId) ?? Chain.Ethereum,
 *   address: sdkToken.address,
 * }))
 * ```
 */
// If there are no custom options
export function createFixture<T extends object>(): {
  <V extends T>(
    getValues: () => V,
  ): {
    // If some fields returned by getValues are overridden
    <O extends Partial<T>>(
      overrides: O,
    ): V extends (infer I)[]
      ? (Omit<I, keyof O> & O)[] // update type of each array element
      : Omit<V, keyof O> & O // update type of the object
    // If no fields are overridden
    (): V
  }
}

// If there are custom options with default values object
export function createFixture<T extends object, P extends object>(
  defaultOptions: Required<P>, // defaultOptions is an object with default options
): {
  <V extends T>(
    getValues: (options: P) => V,
  ): {
    // If some fields returned by getValues are overridden
    <O extends Partial<T & P>>(
      overrides: O,
    ): V extends (infer I)[]
      ? (Omit<I, Exclude<keyof O, keyof T>> & Omit<O, keyof P>)[] // update type of each array element
      : Omit<V, Exclude<keyof O, keyof T>> & Omit<O, keyof P> // update type of the object
    // If no fields are overridden
    (): V
  }
}

// If there are custom options with default values getter function
export function createFixture<T extends object, P extends object>(
  getDefaultOptions: () => Required<P>, // getDefaultOptions is a function that returns an object with default options
): {
  <V extends T>(
    getValues: (options: P) => V,
  ): {
    // If some fields returned by getValues are overridden
    <O extends Partial<T & P>>(
      overrides: O,
    ): V extends (infer I)[]
      ? (Omit<I, Exclude<keyof O, keyof T>> & Omit<O, keyof P>)[] // update type of each array element
      : Omit<V, Exclude<keyof O, keyof T>> & Omit<O, keyof P> // update type of the object
    // If no fields are overridden
    (): V
  }
}

export function createFixture<T extends object, P extends object>(
  defaultOptionsOrGetter?: Required<P> | (() => Required<P>),
) {
  return <V extends T>(getValues: (options?: P) => V) => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    return <O extends Partial<T> | Partial<T & P>>(overrides?: O) => {
      // Get default options (if they exist)
      const defaultOptions =
        typeof defaultOptionsOrGetter === 'function' ? defaultOptionsOrGetter() : defaultOptionsOrGetter
      // Get overrides for options (filter out undefined values)
      const optionOverrides = Object.fromEntries(
        Object.entries(
          defaultOptions ? pick(overrides || ({} as { [key in string]: unknown }), Object.keys(defaultOptions)) : {},
        ).filter(([, value]) => value !== undefined),
      )
      // Get values with getValues function
      const mergedOptions = defaultOptions ? { ...defaultOptions, ...optionOverrides } : undefined
      const values = getValues(mergedOptions)
      // Get overrides for values
      const valueOverrides = overrides
        ? omit(overrides as { [key in string]: unknown }, Object.keys(defaultOptions || []))
        : {}
      return Array.isArray(values)
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          values.map((v) => ({ ...v, ...valueOverrides }))
        : { ...values, ...valueOverrides }
    }
  }
}
