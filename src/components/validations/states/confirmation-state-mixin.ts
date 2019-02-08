import { BaseState, BasicAnswerTypes, BasicHandable, Constructor, GenericIntent, Transitionable } from "assistant-source";
import { CommonFunctionsMixin } from "../mixins/common-functions";
import { COMPONENT_NAME } from "../private-interfaces";
import { ConfirmationStateMixinInstance, ConfirmationStateMixinRequirements, HookContext, sessionKeys, ValidationStrategy } from "../public-interfaces";

// Defines the public members requirements to an instance of a prompt state
type ConfirmationStateInstanceRequirements = BaseState<BasicAnswerTypes, BasicHandable<BasicAnswerTypes>> & ConfirmationStateMixinRequirements;

export function ConfirmationStateMixin<T extends Constructor<ConfirmationStateInstanceRequirements>>(
  superState: T
): Constructor<ConfirmationStateMixinInstance & ConfirmationStateMixinRequirements> {
  return class extends superState {
    public async invokeGenericIntent(machine: Transitionable, tellInvokeMessage = true, ...additionalArgs: any[]) {
      const context = await this.unserializeHook();

      if (tellInvokeMessage) {
        this.logger.debug(this.getLoggerOptions(), "Sending initial confirmation message");
        this.responseHandler.prompt(this.translateHelper.t(`.${context.state}.${context.intent}`));
      }
    }

    public async yesGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      const context = await this.unserializeHook();

      if (typeof context === "undefined" || context === null) throw new Error("HookContext must not be undefined!");

      const redirectArgs = [...context.redirectArguments, true];

      await machine.redirectTo(context.state, context.intent.replace("Intent", ""), ...redirectArgs);
    }

    public async noGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      const context = await this.unserializeHook();

      if (typeof context === "undefined" || context === null) throw new Error("HookContext must not be undefined!");

      const redirectArgs = [...context.redirectArguments, false];

      await machine.redirectTo(context.state, context.intent.replace("Intent", ""), ...redirectArgs);
    }

    public async helpGenericIntent(machine: Transitionable, ...additionalArgs: any[]) {
      const context = await this.unserializeHook();

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

    /**
     * Unserializes hook context
     */
    public async unserializeHook(): Promise<HookContext<ValidationStrategy.Confirmation>> {
      const serializedHook = await this.sessionFactory().get(sessionKeys.confirmation.context);

      if (serializedHook) {
        return JSON.parse(serializedHook) as HookContext<ValidationStrategy.Confirmation>;
      }

      throw new Error("HookContext cannot be undefined.");
    }

    private getLoggerOptions() {
      return { component: COMPONENT_NAME };
    }
  };
}
