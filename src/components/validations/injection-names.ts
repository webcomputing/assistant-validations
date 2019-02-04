/** Names of injectionable services, leads to fewer typing errors for most important injections */
export const validationsInjectionNames = {
  /**
   * Namespace for services which are only available in the request scope.
   */
  current: {
    /**
     * Inject an instance of @type {ValidationsInitializer}}
     */
    validationsInitializer: "validations:validations-initializer",
  },
};
