/**
 * .what = the options a caller may pass when it instantiates a domain object
 * .why = declared in its own file, rather than on `DomainObject`, so a reader that needs the shape
 *   but not the class can reach it without an import cycle — the same decomposition
 *   `DomainObjectShape` and `DomainObjectConstructor` already follow. `getContract` is such a
 *   reader: `DomainObject` imports `getContract`, so the reverse edge would close a cycle.
 */
export interface DomainObjectInstantiationOptions {
  /**
   * allow callers to skip certain aspects of instantiation
   *
   * e.g., for performance optimizations in specific usecases
   */
  skip?: {
    /**
     * allow callers to skip schema validation
     *
     * usecase examples
     * - deserialize: schema validation increases deserialization time dramatically (10-100x) (especially if using Joi, that thing is slow!)
     * - contract: the boundary schema validated these exact props one step earlier
     */
    schema?: boolean;
  };
}
