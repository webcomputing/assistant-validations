import { injectionNames, Transitionable } from "assistant-source";
import { ValidationsInitializer, validationsInjectionNames } from "../src/assistant-validations";
import { BeforeIntentHook } from "../src/components/validations/hook";
import { ThisContext } from "./this-context";

interface CurrentThisContext extends ThisContext {
  stateMachine: Transitionable;
  hook: BeforeIntentHook;
  validationsInitializer: ValidationsInitializer;

  prepareMock: (runMachine?: boolean) => Promise<void>;
}

describe("hook", function() {
  beforeEach(async function(this: CurrentThisContext) {
    this.prepareWithStates();

    this.prepareMock = (runMachine = true) => {
      // Rebind mocks in singleton scope
      this.container.inversifyInstance
        .rebind(BeforeIntentHook)
        .to(BeforeIntentHook)
        .inSingletonScope();
      this.container.inversifyInstance
        .rebind(validationsInjectionNames.current.validationsInitializer)
        .to(ValidationsInitializer)
        .inSingletonScope();

      // Get relevant instances
      this.hook = this.container.inversifyInstance.get(BeforeIntentHook);
      this.validationsInitializer = this.container.inversifyInstance.get(validationsInjectionNames.current.validationsInitializer);
      this.stateMachine = this.container.inversifyInstance.get(injectionNames.current.stateMachine);

      // Register relevant spies
      spyOn(this.validationsInitializer, "initializePrompt").and.callThrough();

      if (runMachine) {
        return this.googleSpecHelper.specHelper.runMachine("MainState") as Promise<void>;
      }
      return Promise.resolve();
    };
  });

  describe("with multiple entities configured", function() {
    const additionalExtraction = { entities: { city: "Münster" } };

    describe("with all entities present", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.googleSpecHelper.pretendIntentCalled("test", additionalExtraction);
        await this.prepareMock();
      });

      it("does nothing", async function(this: CurrentThisContext) {
        expect(this.validationsInitializer.initializePrompt).not.toHaveBeenCalled();
      });
    });

    describe("with one entity missing", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.googleSpecHelper.pretendIntentCalled("testMany", additionalExtraction);
      });

      describe("as platform intent call", function() {
        beforeEach(async function(this: CurrentThisContext) {
          await this.prepareMock();
        });

        it("calls validationsInitializer#initializePrompt with given arguments", async function(this: CurrentThisContext) {
          expect(this.validationsInitializer.initializePrompt).toHaveBeenCalledWith("MainState", "testManyIntent", "amount", {
            redirectArguments: [],
          });
        });
      });

      describe("as state machine transition with additional arguments", function() {
        beforeEach(async function(this: CurrentThisContext) {
          await this.prepareMock(false);
          await this.stateMachine.handleIntent("testMany", "arg1", "arg2");
        });

        it("passes the additional arguments to validationsInitializer", async function(this: CurrentThisContext) {
          expect(this.validationsInitializer.initializePrompt).toHaveBeenCalledWith(jasmine.any(String), jasmine.any(String), jasmine.any(String), {
            redirectArguments: ["arg1", "arg2"],
          });
        });
      });
    });

    describe("with custom prompt state given via decorator", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.googleSpecHelper.pretendIntentCalled("testCustomPromptState", additionalExtraction);
        await this.prepareMock();
      });

      it("calls prompt factory with custom prompt state name", async function(this: CurrentThisContext) {
        expect(this.validationsInitializer.initializePrompt).toHaveBeenCalledWith("MainState", "testCustomPromptStateIntent", jasmine.any(String), {
          redirectArguments: [],
          promptStateName: "MyPromptState",
        });
      });
    });
  });

  describe("with no entities configured", function() {
    beforeEach(async function(this: CurrentThisContext) {
      await this.googleSpecHelper.pretendIntentCalled("noEntities");
      await this.prepareMock();
    });

    it("does nothing", async function(this: CurrentThisContext) {
      expect(this.validationsInitializer.initializePrompt).not.toHaveBeenCalled();
    });
  });
});
