import { injectionNames } from "assistant-source";
import { BeforeIntentHook } from "../src/components/validations/hook";
import { ThisContext } from "./this-context";

interface CurrentThisContext extends ThisContext {
  stateMachine: any;
  hook: BeforeIntentHook;
  promptedParam: any;
}

describe("hook", function() {
  beforeEach(async function(this: CurrentThisContext) {
    this.prepareWithStates();
  });

  const prepareMock = (instance: CurrentThisContext, runMachine = true) => {
    instance.container.inversifyInstance
      .rebind(BeforeIntentHook)
      .to(BeforeIntentHook)
      .inSingletonScope();

    instance.hook = instance.container.inversifyInstance.get(BeforeIntentHook);
    instance.promptedParam = null;
    spyOn(instance.hook as any, "promptFactory").and.returnValue({
      prompt: p =>
        new Promise((resolve, reject) => {
          instance.promptedParam = p;
          resolve();
        }),
    });

    if (runMachine) {
      return instance.alexaSpecHelper.specSetup.runMachine() as Promise<void>;
    }
    return Promise.resolve();
  };

  describe("with multiple entities configured", function() {
    const additionalExtraction = { entities: { city: "Münster" } };

    describe("with all entities present", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.alexaSpecHelper.pretendIntentCalled("test", false, additionalExtraction);
        await prepareMock(this);
      });

      it("does nothing", async function(this: CurrentThisContext) {
        expect((this.hook as any).promptFactory).not.toHaveBeenCalled();
      });
    });

    describe("with one entity missing", function() {
      beforeEach(async function(this: CurrentThisContext) {
        await this.alexaSpecHelper.pretendIntentCalled("testMany", false, additionalExtraction);
      });

      describe("as platform intent call", function() {
        beforeEach(async function(this: CurrentThisContext) {
          await prepareMock(this);
        });

        it("calls prompt factory with given arguments", async function(this: CurrentThisContext) {
          this.stateMachine = this.container.inversifyInstance.get(injectionNames.current.stateMachine);
          expect((this.hook as any).promptFactory).toHaveBeenCalledWith("testManyIntent", "MainState", this.stateMachine, undefined, []);
        });

        it("prompts the needed entity", async function(this: CurrentThisContext) {
          expect(this.promptedParam).toEqual("amount");
        });
      });

      describe("as state machine transition with additional arguments", function() {
        beforeEach(async function(this: CurrentThisContext) {
          await prepareMock(this, false);
          this.stateMachine = this.container.inversifyInstance.get(injectionNames.current.stateMachine);
          await this.stateMachine.handleIntent("testMany", "arg1", "arg2");
        });

        it("passes the additional arguments to promptFactory", async function(this: CurrentThisContext) {
          expect((this.hook as any).promptFactory).toHaveBeenCalledWith("testManyIntent", "MainState", this.stateMachine, undefined, ["arg1", "arg2"]);
        });
      });
    });
  });

  describe("with no entities configured", function() {
    beforeEach(async function(this: CurrentThisContext) {
      await this.alexaSpecHelper.pretendIntentCalled("noEntities", false);
      await prepareMock(this);
    });

    it("does nothing", async function(this: CurrentThisContext) {
      expect((this.hook as any).promptFactory).not.toHaveBeenCalled();
    });
  });
});
