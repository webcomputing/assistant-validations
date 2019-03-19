import { Constructor, Transitionable } from "assistant-source";
import { CommonFunctionsMixin } from "../mixins/common-functions";
import {
  CommonFunctionsInstanceRequirements,
  CommonFunctionsMixinInstance,
  ConfirmationResult,
  confirmationResultIdentifier,
  ConfirmationStateMixinInstance,
  ConfirmationStateMixinRequirements,
  ValidationStrategy,
} from "../public-interfaces";

/**
 * Defines the public members requirements to an instance of a confirmation state.
 */
export function ConfirmationStateMixin<T extends Constructor<ConfirmationStateMixinRequirements>>(
  superState: T
): T & Constructor<CommonFunctionsMixinInstance & ConfirmationStateMixinRequirements & ConfirmationStateMixinInstance> {
  return confirmationStateMixin(CommonFunctionsMixin(superState));
}

/**
 * The actual mixin function for confirmation state. Because this mixin requires another one, `CommonFunctionsMixin`, we have to
 * delegate this to a helper function to bypass some issues with TypeScript's mixin classes pattern. Those should always
 * strictly look as follows without extra mixins.
 */
function confirmationStateMixin<T extends Constructor<ConfirmationStateMixinRequirements> & ReturnType<typeof CommonFunctionsMixin>>(superState: T) {
  return class extends superState {
    public async invokeGenericIntent(machine: Transitionable, tellInvokeMessage = true, ...additionalArgs: any[]) {
      if (tellInvokeMessage) {
        this.handleInvokeMessage(
          "Sending initial confirmation message",
          await this.getSuggestionChipsTranslationConvention(),
          await this.getPromptTranslationConvention()
        );
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
      await this.endSessionWith(this.t());
    }

    /** Get the translation convention which represents the lookup string under which the translations for the confirmation state are found. */
    public async getPromptTranslationConvention() {
      const context = await this.unserializeHookContext<ValidationStrategy.Confirmation>();
      return `.${context.state}.${context.intent}`;
    }

    /** Get the translation convention which represents the lookup string under which the translations for the suggestion chips are found. */
    public async getSuggestionChipsTranslationConvention() {
      return ".suggestionChips";
    }

    /**
     * Helper to handle a yes and no intent in one function.
     * Creates a confirmationResult and redirects to the given state and intent providing the result.
     * @param machine Transitionable interface
     * @param answer If set to true, answer was yes, else it was no
     */
    private async handleYesOrNo(machine: Transitionable, answer: boolean) {
      const context = await this.unserializeHookContext<ValidationStrategy.Confirmation>();

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
      this.responseHandler.prompt(this.t(await this.getPromptTranslationConvention()));
    }
  };
}
