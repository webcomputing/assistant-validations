export namespace Configuration {
  /** Configuration defaults -> all of these keys are optional for user */
  export interface Defaults {
    /** Name of prompt state to use for all @needs validations as default */
    defaultPromptState: string;
  }

  /** Required configuration options, no defaults are used here */
  export interface Required {}

  /** Available configuration settings in a runtime application */
  export interface Runtime extends Defaults, Required {};
}

/** Name of component */
export const COMPONENT_NAME = "validations";