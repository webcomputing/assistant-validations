import { injectionNames, Transitionable } from "assistant-source";
import { ConfirmationResult, confirmationResultIdentifier, ValidationsInitializer, validationsInjectionNames } from "../src/assistant-validations";
import { BeforeIntentHook } from "../src/components/validations/hook";
import { ThisContext } from "./this-context";

interface CurrentThisContext extends ThisContext {
  stateMachine: Transitionable;
  hook: BeforeIntentHook;
  validationsInitializer: ValidationsInitializer;

  /**
   * Prepares spies, BeforeIntentHook etc.
   * @param {boolean} runMachine If set to true, runMachine() will be called after preparation
   * @param {any[]} args Additional args to pass to runMachine() call
   */
  prepareMock: (runMachine?: boolean, ...args: any[]) => Promise<void>;
}

describe("Hook", function() {
  beforeEach(async function(this: CurrentThisContext) {
    this.prepareWithStates();

    this.prepareMock = (runMachine = true, ...args: any[]) => {
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
      spyOn(this.validationsInitializer, "initializeConfirmation").and.callThrough();

      if (runMachine) {
        return this.googleSpecHelper.specHelper.runMachine("MainState", ...args) as Promise<void>;
      }
      return Promise.resolve();
    };
  });

  describe("regarding prompting", function() {
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

        it("calls validations initializer with custom prompt state name", async function(this: CurrentThisContext) {
          expect(this.validationsInitializer.initializePrompt).toHaveBeenCalledWith("MainState", "testCustomPromptStateIntent", jasmine.any(String), {
            redirectArguments: [],
            promptStateName: "MyPromptState",
          });
        });
      });
    });
  });

  describe("regarding confirmation", function() {
    describe("with intent not yet confirmed", function() {
      describe("with custom confirmation state given in @needsConfirmation decorator", function() {
        beforeEach(async function(this: CurrentThisContext) {
          await this.googleSpecHelper.pretendIntentCalled("needsConfirmationCustomState");
          await this.prepareMock();
        });

        it("calls ValidationsInitializer#initializeConfirmation with given confirmation state", async function(this: CurrentThisContext) {
          expect(this.validationsInitializer.initializeConfirmation).toHaveBeenCalledWith("MainState", "needsConfirmationCustomStateIntent", {
            confirmationStateName: "MyConfirmationState",
            redirectArguments: [],
          });
        });
      });

      describe("with no custom confirmation state given in @needsConfirmation decorator", function() {
        beforeEach(async function(this: CurrentThisContext) {
          await this.googleSpecHelper.pretendIntentCalled("needsConfirmation");
          await this.prepareMock();
        });

        it("calls ValidationsInitializer#initializeConfirmation with no custom confirmation state", async function(this: CurrentThisContext) {
          expect(this.validationsInitializer.initializeConfirmation).toHaveBeenCalledWith("MainState", "needsConfirmationIntent", { redirectArguments: [] });
        });
      });
    });

    describe("with intent already being confirmed", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.googleSpecHelper.pretendIntentCalled("needsConfirmation");

        const confirmationResult: ConfirmationResult = { returnIdentifier: confirmationResultIdentifier, confirmed: true };
        await this.prepareMock(true, confirmationResult);
      });

      it("does not call ValidationsInitializer#initializeConfirmation", async function(this: CurrentThisContext) {
        expect(this.validationsInitializer.initializeConfirmation).not.toHaveBeenCalled();
      });
    });
  });

  describe("with no decorators used at all", function() {
    beforeEach(async function(this: CurrentThisContext) {
      await this.googleSpecHelper.pretendIntentCalled("noDecorators");
      await this.prepareMock();
    });

    it("does not call #initializePrompt", async function(this: CurrentThisContext) {
      expect(this.validationsInitializer.initializePrompt).not.toHaveBeenCalled();
    });

    it("does not call #initializeConfirmation", async function(this: CurrentThisContext) {
      expect(this.validationsInitializer.initializeConfirmation).not.toHaveBeenCalled();
    });
  });
});
