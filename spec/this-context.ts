import { GoogleSpecHelper } from "assistant-google";
import { AssistantJSSetup, SpecHelper, SpecHelperOptions, StateMachineSetup, TranslateValuesFor } from "assistant-source";
import { interfaces as inversifyInterfaces } from "inversify";

export interface ThisContext {
  /** StateMachineSetup instance */
  stateMachineSetup: StateMachineSetup;

  /** AssistantJS setup instance */
  assistantJs: AssistantJSSetup;

  /** Instance of AssistantJS's spec helper */
  specHelper: SpecHelper;

  /** Reference to inversify instance */
  inversify: inversifyInterfaces.Container;

  /** Default spec options to pass into specHelper.prepareSpec(). You might want to override some options per spec. */
  defaultSpecOptions: Partial<SpecHelperOptions>;

  /** List of registered spec helpers */
  platforms: {
    google: GoogleSpecHelper;
  };

  /** Use this for any untyped test params */
  params: any;

  /** Calls specHelper.prepare() and also adds all mock states */
  prepareWithStates(): void;

  /** Shorten access to i18next helper */
  translateValuesForGetter(): TranslateValuesFor;
}
