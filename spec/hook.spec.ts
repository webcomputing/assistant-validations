import { Prompt } from "../src/components/validations/prompt";
import { BeforeIntentHook } from "../src/components/validations/hook";

describe("hook", function() {
  beforeEach(function() {
    this.prepareWithStates();
  });

  let prepareMock = (instance) => {
    instance.container.inversifyInstance.rebind(BeforeIntentHook).to(BeforeIntentHook).inSingletonScope();
    
    instance.hook = instance.container.inversifyInstance.get(BeforeIntentHook);
    instance.promptedParam = null;
    spyOn(instance.hook, "promptFactory").and.returnValue({
      prompt: (p) => new Promise((resolve, reject) => { instance.promptedParam = p; resolve(); })
    });

    return instance.alexaHelper.specSetup.runMachine() as Promise<void>;
  }

  describe("with multiple entities configured", function() {
    let additionalExtraction = { entities: { city: "Münster" } };

    describe("with all entities present", function() {
      beforeEach(async function(done) {
        await this.alexaHelper.pretendIntentCalled("test", false, additionalExtraction);
        await prepareMock(this);
        done();
      })

      it("does nothing", function() {
        expect(this.hook.promptFactory).not.toHaveBeenCalled();
      });
    })

    describe("with one entity missing", function() {
      beforeEach(async function(done) {
        await this.alexaHelper.pretendIntentCalled("testMany", false, additionalExtraction);
        await prepareMock(this);
        done();
      })

      it("calls prompt factory with given arguments", function() {
        this.stateMachine = this.container.inversifyInstance.get("core:state-machine:current-state-machine");
        expect(this.hook.promptFactory).toHaveBeenCalledWith("testManyIntent", "MainState", this.stateMachine);
      });

      it("prompts the needed entity", function() {
        expect(this.promptedParam).toEqual("amount");
      })
    });
  });

  describe("with no entities configured", function() {
    beforeEach(async function(done) {
      await this.alexaHelper.pretendIntentCalled("noEntities", false);
      await prepareMock(this);
      done();
    })
    

    it("does nothing", function() {
      expect(this.hook.promptFactory).not.toHaveBeenCalled();
    })
  });
});