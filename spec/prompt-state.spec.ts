import { unifierInterfaces } from "assistant-source";

describe("PromptState", function() {
  const hookContext = {
    "intent": "testIntent",
    "state": "MainState",
    "neededEntity": "city"
  };

  beforeEach(function() {
    this.prepareWithStates();

    this.callIntent = async (intent, callMachine = true, setContext = true, state = "PromptState") => {
      let responseHandle = await this.alexaHelper.pretendIntentCalled(intent, false);
      if (setContext) await this.setHookContext();
      if (callMachine) await this.specHelper.runMachine(state);
      return responseHandle;
    }

    this.setHookContext = () => {
      let session = this.container.inversifyInstance.get("core:unifier:current-session-factory")();
      return session.set("entities:currentPrompt", JSON.stringify(hookContext));
    }
  });

  describe("helpGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(unifierInterfaces.GenericIntent.Help);
      done();
    });

    it("returns specific help text", function() {
      expect(this.responseHandler.voiceMessage).toEqual("Help for city");
      expect(this.responseHandler.endSession).toBeFalsy();
    });
  });

  describe("unhandledIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent("not-existing");
      done();
    });

    it("returns default prompt text", function() {
      expect(this.responseHandler.voiceMessage).toEqual("Prompt for city");
      expect(this.responseHandler.endSession).toBeFalsy();
    });
  });

  describe("invokeGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(unifierInterfaces.GenericIntent.Invoke, false, false);
      done();
    });

    describe("with defined hook context", function() {
      beforeEach(async function(done) {
        await this.setHookContext();
        await this.specHelper.runMachine("PromptState");
        done();
      });

      it("returns the invoke text as prompt", function() {
        expect(this.responseHandler.voiceMessage).toEqual("Prompt for city");
        expect(this.responseHandler.endSession).toBeFalsy();
      })
    });

    describe("with no hook context defined", function() {
      it("throws an exception", async function(done) {
        try {
          await this.specHelper.runMachine("PromptState");
          expect(false).toBeTruthy();
        } catch(e) {
          expect(false).toBeFalsy();
        }
        done();
      })
    });
  })
});