import { Constructor, GenericIntent, Transitionable } from "assistant-source";
import { CommonFunctionsInstanceRequirements, CommonFunctionsMixin } from "../mixins/common-functions";
import { ConfirmationStateMixinInstance, ConfirmationStateMixinRequirements, sessionKeys, ValidationStrategy } from "../public-interfaces";

// Defines the public members requirements to an instance of a prompt state
type ConfirmationStateInstanceRequirements = CommonFunctionsInstanceRequirements & ConfirmationStateMixinRequirements;

export function ConfirmationStateMixin<T extends Constructor<ConfirmationStateInstanceRequirements>>(
  superState: T
): Constructor<ConfirmationStateMixinInstance & ConfirmationStateMixinRequirements> {
  return class extends CommonFunctionsMixin(superState) {
    public async invokeGenericIntent(machine: Transitionable, tellInvokeMessage = true, ...additionalArgs: any[]) {
      const context = await this.unserializeHook<ValidationStrategy.Confirmation>(sessionKeys.confirmation.context);

      if (tellInvokeMessage) {
        this.handleInvokeMessage("Sending initial confirmation message", `.${context.state}.${context.intent}`);
      }
    }

    public async yesGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      await this.handleYesOrNo(machine, true);
    }

    public async noGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      await this.handleYesOrNo(machine, false);
    }

    public async helpGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      const context = await this.unserializeHook<ValidationStrategy.Confirmation>(sessionKeys.confirmation.context);

      if (typeof context === "undefined" || typeof context.intent === "undefined") {
        this.responseHandler.prompt(this.translateHelper.t());
      } else {
        this.responseHandler.prompt(this.translateHelper.t(`.${context.state}.${context.intent}`));
      }
    }

    public async unhandledGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      return machine.handleIntent(GenericIntent.Help);
    }

    public async cancelGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      await this.endSessionWith(this.translateHelper.t());
    }

    private async handleYesOrNo(machine: Transitionable, answer: boolean) {
      const context = await this.unserializeHook<ValidationStrategy.Confirmation>(sessionKeys.confirmation.context);

      if (typeof context === "undefined" || context === null) throw new Error("HookContext must not be undefined!");

      const redirectArgs = [...context.redirectArguments, answer];

      await machine.redirectTo(context.state, context.intent.replace("Intent", ""), ...redirectArgs);
    }
  };
}
