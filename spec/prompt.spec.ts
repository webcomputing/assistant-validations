import { GenericIntent, injectionNames, State, Transitionable } from "assistant-source";
import { validationsInjectionNames } from "../src/components/validations/injection-names";
import { Prompt as PromptImpl } from "../src/components/validations/prompt";
import { Prompt, PromptFactory } from "../src/components/validations/public-interfaces";
import { ThisContext } from "./this-context";

interface CurrentThisContext extends ThisContext {
  machine: any;
  prompt: Prompt;
  currentStateProvider: State.CurrentProvider;
  preparePrompt(promptStateName?: string, additionalArguments?: any[]): Promise<void>;
}

describe("Prompt", function() {
  const intent = "testIntent";
  const state = "MainState";

  beforeEach(async function(this: CurrentThisContext) {
    this.preparePrompt = async (promptStateName?: string, additionalArguments = []) => {
      await this.googleSpecHelper.pretendIntentCalled("test");
      this.machine = this.container.inversifyInstance.get(injectionNames.current.stateMachine);
      this.prompt = this.container.inversifyInstance.get<PromptFactory>(validationsInjectionNames.current.promptFactory)(
        intent,
        state,
        this.machine,
        promptStateName,
        additionalArguments
      );
      this.currentStateProvider = this.container.inversifyInstance.get<State.CurrentProvider>(injectionNames.current.stateProvider);
    };
  });

  describe("prompt()", function() {
    it("saves entity in an PromptContext to session", async function(this: CurrentThisContext) {
      this.prepareWithStates();
      await this.preparePrompt();

      spyOn(this.prompt as PromptImpl, "switchStateForRetrieval");
      await this.prompt.prompt("city");

      const context = await (this.prompt as any).session.get("entities:currentPrompt");
      expect(JSON.parse(context)).toEqual({
        intent,
        state,
        neededEntity: "city",
        redirectArguments: [],
      });
    });

    describe("with additional redirect arguments", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.prepareWithStates();
        await this.preparePrompt(undefined, ["additionalArg1", "additionalArg2"]);
      });

      it("stores additional arguments in hook context", async function(this: CurrentThisContext) {
        spyOn(this.prompt as PromptImpl, "switchStateForRetrieval");
        await this.prompt.prompt("city");

        const context = await (this.prompt as any).session.get("entities:currentPrompt");
        expect(JSON.parse(context).redirectArguments).toEqual(["additionalArg1", "additionalArg2"]);
      });
    });

    describe("with PromptState configured", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.prepareWithStates();
        await this.preparePrompt();
      });

      it("transitions to PromptState", async function(this: CurrentThisContext) {
        await this.prompt.prompt("city");
        const currentState = await this.currentStateProvider();
        expect(currentState.name).toEqual("PromptState");
      });

      describe("using tellInvokeMessage = true", function() {
        it("calls machine.redirectTo with tellInvokeMessage = true", async function(this: CurrentThisContext) {
          spyOn(this.machine, "redirectTo").and.callThrough();
          await this.prompt.prompt("city");
          expect(this.machine.redirectTo).toHaveBeenCalledWith("PromptState", GenericIntent.Invoke, true);
        });
      });

      describe("using invokeIntent = false", function() {
        it("calls machine.redirectTo with tellInvokeMessage = false", async function(this: CurrentThisContext) {
          spyOn(this.machine, "redirectTo").and.callThrough();
          await this.prompt.prompt("city", false);
          expect(this.machine.redirectTo).toHaveBeenCalledWith("PromptState", GenericIntent.Invoke, false);
        });
      });
    });

    describe("without PromptState configured", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.specHelper.prepare();
        await this.preparePrompt();
      });

      it("throws an exception", async function(this: CurrentThisContext) {
        try {
          await this.prompt.prompt("city");
          expect(true).toBeFalsy();
        } catch (e) {
          expect(true).toBeTruthy();
        }
      });
    });

    describe("with promptStateName set to 'MyPromptState'", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.prepareWithStates();
        await this.preparePrompt("MyPromptState");
      });

      it("transitions to MyPromptState instead", async function(this: CurrentThisContext) {
        await this.prompt.prompt("city");
        const currentState = await this.currentStateProvider();
        expect(currentState.name).toEqual("MyPromptState");
      });
    });

    describe("with changed configuration", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.assistantJs.addConfiguration({
          validations: {
            defaultPromptState: "MyPromptState",
          },
        });

        this.prepareWithStates();
        await this.preparePrompt();
      });

      it("transitions to configured prompt state instead", async function(this: CurrentThisContext) {
        await this.prompt.prompt("city");
        const currentState = await this.currentStateProvider();
        expect(currentState.name).toEqual("MyPromptState");
      });
    });
  });
});
