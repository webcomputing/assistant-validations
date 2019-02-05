import { Component, getMetaInjectionName } from "inversify-components";
import { InitializerOptions, ValidationsInitializer, validationsInjectionNames } from "../src/assistant-validations";
import { COMPONENT_NAME, Configuration } from "../src/components/validations/private-interfaces";
import { ConfirmationTransition } from "../src/components/validations/transitions/confirmation-transition";
import { PromptTransition } from "../src/components/validations/transitions/prompt-transition";
import { ThisContext } from "./this-context";

interface CurrentThisContext extends ThisContext {
  validationsInitializer: ValidationsInitializer;
  promptTransition: PromptTransition;
  confirmationTransition: ConfirmationTransition;
  configuration: Configuration.Runtime;
  defaults: {
    prompt: InitializerOptions.Prompt;
    confirmation: InitializerOptions.Confirmation;
  };
}

describe("ValidationsInitializer", function() {
  beforeEach(async function(this: CurrentThisContext) {
    this.prepareWithStates();
    await this.specHelper.prepareIntentCall(this.platforms.google, "test");
    this.validationsInitializer = this.inversify.get(validationsInjectionNames.current.validationsInitializer);
    this.promptTransition = (this.validationsInitializer as any).promptTransition;
    this.confirmationTransition = (this.validationsInitializer as any).confirmationTransition;
    this.configuration = this.inversify.get<Component<Configuration.Runtime>>(getMetaInjectionName(COMPONENT_NAME)).configuration;

    this.defaults = {
      prompt: {
        tellInvokeMessage: true,
        redirectArguments: [],
        promptStateName: this.configuration.defaultPromptState,
      },
      confirmation: {
        tellInvokeMessage: true,
        redirectArguments: [],
        confirmationStateName: this.configuration.defaultConfirmationState,
      },
    };

    spyOn(this.promptTransition, "transition").and.callThrough();
    spyOn(this.confirmationTransition, "transition").and.callThrough();
  });

  describe("#initializePrompt", function() {
    describe("with defaultPromptState given, but set to undefined", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.validationsInitializer.initializePrompt("MainState", "invokeGenericIntent", "amount", { promptStateName: undefined });
      });

      it("uses prompt state name from configuration", async function(this: CurrentThisContext) {
        expect(this.promptTransition.transition).toHaveBeenCalledWith(
          "amount",
          "MainState",
          "invokeGenericIntent",
          this.defaults.prompt.redirectArguments,
          this.defaults.prompt.promptStateName,
          this.defaults.prompt.tellInvokeMessage
        );
      });
    });

    describe("with options given", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.validationsInitializer.initializePrompt("MainState", "invokeGenericIntent", "amount", {
          tellInvokeMessage: !this.defaults.prompt.tellInvokeMessage,
          redirectArguments: ["a"],
          promptStateName: "MyPromptState",
        });
      });

      it("overrides all defaults", async function(this: CurrentThisContext) {
        expect(this.promptTransition.transition).toHaveBeenCalledWith("amount", "MainState", "invokeGenericIntent", ["a"], "MyPromptState", false);
      });
    });

    describe("with no options given", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.validationsInitializer.initializePrompt("MainState", "invokeGenericIntent", "amount");
      });

      it("uses all defaults", async function(this: CurrentThisContext) {
        expect(this.promptTransition.transition).toHaveBeenCalledWith(
          "amount",
          "MainState",
          "invokeGenericIntent",
          this.defaults.prompt.redirectArguments,
          this.defaults.prompt.promptStateName,
          this.defaults.prompt.tellInvokeMessage
        );
      });
    });
  });

  describe("#initializeConfirmation", function() {
    describe("with no options given", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.validationsInitializer.initializeConfirmation("MainState", "invokeGenericIntent");
      });

      it("calls ConfirmationTransition#transition with default confirmation state from configuration", async function(this: CurrentThisContext) {
        expect(this.confirmationTransition.transition).toHaveBeenCalledWith(
          "MainState",
          "invokeGenericIntent",
          this.defaults.confirmation.redirectArguments,
          this.defaults.confirmation.confirmationStateName,
          this.defaults.confirmation.tellInvokeMessage
        );
      });
    });

    describe("with options given", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.validationsInitializer.initializeConfirmation("MainState", "invokeGenericIntent", {
          confirmationStateName: "MyConfirmationState",
          redirectArguments: ["a", "b"],
          tellInvokeMessage: false,
        });
      });

      it("calls ConfirmationTransition#transition with given options", async function(this: CurrentThisContext) {
        expect(this.confirmationTransition.transition).toHaveBeenCalledWith("MainState", "invokeGenericIntent", ["a", "b"], "MyConfirmationState", false);
      });
    });
  });
});
