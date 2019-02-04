import { Component, getMetaInjectionName } from "inversify-components";
import { InitializerOptions, ValidationsInitializer, validationsInjectionNames } from "../src/assistant-validations";
import { COMPONENT_NAME, Configuration } from "../src/components/validations/private-interfaces";
import { PromptTransition } from "../src/components/validations/transitions/prompt-transition";
import { ThisContext } from "./this-context";

interface CurrentThisContext extends ThisContext {
  validationsInitializer: ValidationsInitializer;
  promptTransition: PromptTransition;
  configuration: Configuration.Runtime;
  defaults: InitializerOptions.Prompt;
}

describe("ValidationsInitializer", function() {
  beforeEach(async function(this: CurrentThisContext) {
    this.prepareWithStates();
    await this.googleSpecHelper.pretendIntentCalled("testIntent");
    this.validationsInitializer = this.container.inversifyInstance.get(validationsInjectionNames.current.validationsInitializer);
    this.promptTransition = (this.validationsInitializer as any).promptTransition;
    this.configuration = this.container.inversifyInstance.get<Component<Configuration.Runtime>>(getMetaInjectionName(COMPONENT_NAME)).configuration;

    this.defaults = {
      tellInvokeMessage: true,
      redirectArguments: [],
      promptStateName: this.configuration.defaultPromptState,
    };

    spyOn(this.promptTransition, "transition").and.callThrough();
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
          this.defaults.redirectArguments,
          this.defaults.promptStateName,
          this.defaults.tellInvokeMessage
        );
      });
    });

    describe("with options given", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.validationsInitializer.initializePrompt("MainState", "invokeGenericIntent", "amount", {
          tellInvokeMessage: !this.defaults.tellInvokeMessage,
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
          this.defaults.redirectArguments,
          this.defaults.promptStateName,
          this.defaults.tellInvokeMessage
        );
      });
    });
  });
});
