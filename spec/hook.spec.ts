import { BeforeIntentHook } from "../src/components/validations/hook";
import { Prompt } from "../src/components/validations/prompt";

describe("hook", function() {
  beforeEach(function() {
    this.prepareWithStates();
  });

  const prepareMock = (instance, runMachine = true) => {
    instance.container.inversifyInstance
      .rebind(BeforeIntentHook)
      .to(BeforeIntentHook)
      .inSingletonScope();

    instance.hook = instance.container.inversifyInstance.get(BeforeIntentHook);
    instance.promptedParam = null;
    spyOn(instance.hook, "promptFactory").and.returnValue({
      prompt: p =>
        new Promise((resolve, reject) => {
          instance.promptedParam = p;
          resolve();
        }),
    });

    if (runMachine) {
      return instance.alexaHelper.specSetup.runMachine() as Promise<void>;
    }
    return Promise.resolve();
  };

  describe("with multiple entities configured", function() {
    const additionalExtraction = { entities: { city: "Münster" } };

    describe("with all entities present", function() {
      beforeEach(async function(done) {
        await this.alexaHelper.pretendIntentCalled("test", false, additionalExtraction);
        await prepareMock(this);
        done();
      });

      it("does nothing", function() {
        expect(this.hook.promptFactory).not.toHaveBeenCalled();
      });
    });

    describe("with one entity missing", function() {
      beforeEach(async function(done) {
        await this.alexaHelper.pretendIntentCalled("testMany", false, additionalExtraction);
        done();
      });

      describe("as platform intent call", function() {
        beforeEach(async function(done) {
          await prepareMock(this);
          done();
        });

        it("calls prompt factory with given arguments", function() {
          this.stateMachine = this.container.inversifyInstance.get("core:state-machine:current-state-machine");
          expect(this.hook.promptFactory).toHaveBeenCalledWith("testManyIntent", "MainState", this.stateMachine, undefined, []);
        });

        it("prompts the needed entity", function() {
          expect(this.promptedParam).toEqual("amount");
        });
      });

      describe("as state machine transition with additional arguments", function() {
        beforeEach(async function(done) {
          await prepareMock(this, false);
          this.stateMachine = this.container.inversifyInstance.get("core:state-machine:current-state-machine");
          await this.stateMachine.handleIntent("testMany", "arg1", "arg2");
          done();
        });

        it("passes the additional arguments to promptFactory", function() {
          expect(this.hook.promptFactory).toHaveBeenCalledWith("testManyIntent", "MainState", this.stateMachine, undefined, ["arg1", "arg2"]);
        });
      });
    });
  });

  describe("with no entities configured", function() {
    beforeEach(async function(done) {
      await this.alexaHelper.pretendIntentCalled("noEntities", false);
      await prepareMock(this);
      done();
    });

    it("does nothing", function() {
      expect(this.hook.promptFactory).not.toHaveBeenCalled();
    });
  });
});
