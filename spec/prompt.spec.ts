import { unifierInterfaces } from "assistant-source";

describe("Prompt", function() {
  const intent = "testIntent";
  const state = "MainState";

  beforeEach(function() {
    this.preparePrompt = async () => {
      await this.alexaHelper.pretendIntentCalled("test", false);
      this.machine = this.container.inversifyInstance.get("core:state-machine:current-state-machine");
      this.prompt = this.container.inversifyInstance.get("validations:current-prompt-factory")(intent, state, this.machine);
      this.currentStateProvider = this.container.inversifyInstance.get("core:state-machine:current-state-provider");
    }
  });

  describe("prompt()", function() {
    it("saves entity in an PromptContext to session", async function(done) {
      this.prepareWithStates();
      await this.preparePrompt();

      spyOn(this.prompt, "switchStateForRetrieval");
      await this.prompt.prompt("city");
      
      let context = await this.prompt.session.get("entities:currentPrompt");
      expect(JSON.parse(context)).toEqual({
        "intent": intent,
        "state": state,
        "neededEntity": "city"
      });
      done();
    });

    describe("with PromptState configured", function() {
      beforeEach(async function(done) {
        this.prepareWithStates();
        await this.preparePrompt();
        done();
      });

      it("transitions to PromptState", async function(done) {
        await this.prompt.prompt("city");
        let currentState = await this.currentStateProvider();
        expect(currentState.name).toEqual("PromptState");
        done();
      });

      describe("using tellInvokeMessage = true", function() {
        it("calls machine.redirectTo with tellInvokeMessage = true", async function(done) {
          spyOn(this.machine, "redirectTo").and.callThrough();
          await this.prompt.prompt("city");
          expect(this.machine.redirectTo).toHaveBeenCalledWith("PromptState", unifierInterfaces.GenericIntent.Invoke, true);
          done();
        });
      });

      describe("using invokeIntent = false", function() {
        it("calls machine.redirectTo with tellInvokeMessage = false", async function(done) {
          spyOn(this.machine, "redirectTo").and.callThrough();
          await this.prompt.prompt("city", false);
          expect(this.machine.redirectTo).toHaveBeenCalledWith("PromptState", unifierInterfaces.GenericIntent.Invoke, false);
          done();
        });
      });
    });

    describe("without PromptState configured", function() {
      beforeEach(async function(done) {
        this.specHelper.prepare();
        await this.preparePrompt();
        done();
      });

      it("throws an exception", async function(done) {
        try {
          await this.prompt.prompt("city");
          expect(true).toBeFalsy();
        } catch(e) {
          expect(true).toBeTruthy();
        }

        done();
      });
    });
  });
});