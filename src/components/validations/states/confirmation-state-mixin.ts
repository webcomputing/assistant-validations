import { Constructor, Transitionable } from "assistant-source";
import { CommonFunctionsMixin } from "../mixins/common-functions";
import {
  CommonFunctionsInstanceRequirements,
  ConfirmationResult,
  confirmationResultIdentifier,
  ConfirmationStateMixinInstance,
  ConfirmationStateMixinRequirements,
  ValidationStrategy,
} from "../public-interfaces";

// Defines the public members requirements to an instance of a confirmation state
type ConfirmationStateInstanceRequirements = CommonFunctionsInstanceRequirements & ConfirmationStateMixinRequirements;

export function ConfirmationStateMixin<T extends Constructor<ConfirmationStateInstanceRequirements>>(
  superState: T
): Constructor<ConfirmationStateMixinInstance & ConfirmationStateMixinRequirements> {
  return class extends CommonFunctionsMixin(superState) {
    public async invokeGenericIntent(machine: Transitionable, tellInvokeMessage = true, ...additionalArgs: any[]) {
      if (tellInvokeMessage) {
        this.handleInvokeMessage("Sending initial confirmation message", ".suggestionChips", await this.getTranslationConvention());
      }
    }

    public async yesGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      await this.handleYesOrNo(machine, true);
    }

    public async noGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      await this.handleYesOrNo(machine, false);
    }

    public async helpGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      await this.handleGenericAnswer(machine);
    }

    public async unhandledGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      await this.handleGenericAnswer(machine);
    }

    public async cancelGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      await this.endSessionWith(this.translateHelper.t());
    }

    /** Get the translation convention which represents the lookup string under which the translations for the confirmation state are found. */
    public async getTranslationConvention() {
      const context = await this.unserializeHook<ValidationStrategy.Confirmation>();
      return `.${context.state}.${context.intent}`;
    }

    /**
     * Helper to handle a yes and no intent in one function.
     * Creates a confirmationResult and redirects to the given state and intent providing the result.
     * @param machine Transitionable interface
     * @param answer If set to true, answer was yes, else it was no
     */
    private async handleYesOrNo(machine: Transitionable, answer: boolean) {
      const context = await this.unserializeHook<ValidationStrategy.Confirmation>();

      const confirmationResult: ConfirmationResult = {
        returnIdentifier: confirmationResultIdentifier,
        confirmed: answer,
      };
      const redirectArgs = [...context.redirectArguments, confirmationResult];

      await machine.redirectTo(context.state, context.intent.replace("Intent", ""), ...redirectArgs);
    }

    /**
     * Helper to handle generic answers depending on the given state and intent.
     * @param machine Transitionable interface
     */
    private async handleGenericAnswer(machine: Transitionable) {
      this.responseHandler.prompt(this.translateHelper.t(await this.getTranslationConvention()));
    }
  };
}
