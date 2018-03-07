import { GenericIntent } from "assistant-source";

describe("Prompt", function() {
  const intent = "testIntent";
  const state = "MainState";

  beforeEach(function() {
    this.preparePrompt = async (promptStateName?: string, additionalArguments = []) => {
      await this.alexaHelper.pretendIntentCalled("test", false);
      this.machine = this.container.inversifyInstance.get("core:state-machine:current-state-machine");
      this.prompt = this.container.inversifyInstance.get("validations:current-prompt-factory")(intent, state, this.machine, promptStateName, additionalArguments);
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
        "neededEntity": "city",
        "redirectArguments": []
      });
      done();
    });

    describe("with additional redirect arguments", function() {
      beforeEach(async function(done) {
        this.prepareWithStates();
        await this.preparePrompt(undefined, ["additionalArg1", "additionalArg2"]);
        done();
      });

      it("stores additional arguments in hook context", async function(done) {
        spyOn(this.prompt, "switchStateForRetrieval");
        await this.prompt.prompt("city");
        
        let context = await this.prompt.session.get("entities:currentPrompt");
        expect(JSON.parse(context).redirectArguments).toEqual(["additionalArg1", "additionalArg2"]);
        done();
      });
    })

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
          expect(this.machine.redirectTo).toHaveBeenCalledWith("PromptState", GenericIntent.Invoke, true);
          done();
        });
      });

      describe("using invokeIntent = false", function() {
        it("calls machine.redirectTo with tellInvokeMessage = false", async function(done) {
          spyOn(this.machine, "redirectTo").and.callThrough();
          await this.prompt.prompt("city", false);
          expect(this.machine.redirectTo).toHaveBeenCalledWith("PromptState", GenericIntent.Invoke, false);
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

    describe("with promptStateName set to 'MyPromptState'", function() {
      beforeEach(async function(done) {
        this.prepareWithStates();
        await this.preparePrompt("MyPromptState");
        done();
      });

      it("transitions to MyPromptState instead", async function(done) {
        await this.prompt.prompt("city");
        let currentState = await this.currentStateProvider();
        expect(currentState.name).toEqual("MyPromptState");
        done();
      });
    });

    describe("with changed configuration", function() {
      beforeEach(async function(done) {
        this.assistantJs.addConfiguration({
          "validations": {
            "defaultPromptState": "MyPromptState"
          }
        });

        this.prepareWithStates();
        await this.preparePrompt();
        done();
      });

      it("transitions to configured prompt state instead", async function(done) {
        await this.prompt.prompt("city");
        let currentState = await this.currentStateProvider();
        expect(currentState.name).toEqual("MyPromptState");
        done();
      });
    });
  });
});