export namespace Configuration {
  /** Configuration defaults -> all of these keys are optional for user */
  export interface Defaults {
    /** Name of prompt state to use for all {@link needsEntities} validations as default state */
    defaultPromptState: string;

    /** Name of confirmation state to use for all {@link needsConfirmation} validations as default state */
    defaultConfirmationState: string;
  }

  /** Required configuration options, no defaults are used here */
  // tslint:disable-next-line:no-empty-interface
  export interface Required {}

  /** Available configuration settings in a runtime application */
  export interface Runtime extends Defaults, Required {}
}

/** Name of component */
export const COMPONENT_NAME = "validations";
