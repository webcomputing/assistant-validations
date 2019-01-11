/** Names of injectionable services, leads to fewer typing errors for most important injections */
export const validationsInjectionNames = {
  /**
   * Inject an instance of @type {Component<Configuration.Runtime>}
   */
  component: "meta:component//validations",
  /**
   * Namespace for services which are only available in the request scope.
   */
  current: {
    /**
     * Inject an instance of @type {PromptFactory}}
     */
    promptFactory: "validations:current-prompt-factory",
  },
};
