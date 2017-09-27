import { unifierInterfaces } from "assistant-source";

describe("PromptState", function() {
  const defaultEntities = {
    "myEntity": "myValue",
    "myEntity2": "myValue2"
  }
  const hookContext = {
    "intent": "testIntent",
    "state": "MainState",
    "neededEntity": "city"
  };

  beforeEach(function() {
    this.prepareWithStates();

    this.callIntent = async (intent, callMachine = true, setContext = true, state = "PromptState", entities: any = undefined) => {
      entities = typeof entities === "undefined" ? defaultEntities : entities;
      let responseHandle = await this.alexaHelper.pretendIntentCalled(intent, false, { entities: entities });

      this.currentSession = this.container.inversifyInstance.get("core:unifier:current-session-factory")();

      if (setContext) await this.setHookContext();
      if (callMachine) await this.specHelper.runMachine(state);
      return responseHandle;
    }

    this.setHookContext = () => {
      let session = this.container.inversifyInstance.get("core:unifier:current-session-factory")();
      return session.set("entities:currentPrompt", JSON.stringify(hookContext));
    }
  });

  describe("cancelGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(unifierInterfaces.GenericIntent.Cancel);
      done();
    });

    it("returns general cancel text", function() {
      expect(this.responseHandler.voiceMessage).toEqual("See you!");
      expect(this.responseHandler.endSession).toBeTruthy();
    });
  });

  describe("stopGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(unifierInterfaces.GenericIntent.Stop);
      done();
    });

    it("returns general cancel text", function() {
      expect(this.responseHandler.voiceMessage).toEqual("See you!");
      expect(this.responseHandler.endSession).toBeTruthy();
    });
  });

  describe("unansweredGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(unifierInterfaces.GenericIntent.Unanswered);
      done();
    });

    it("returns an empty response", function() {
      expect(this.responseHandler.voiceMessage).toEqual("");
      expect(this.responseHandler.endSession).toBeTruthy();
    });
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
    answerPromptBehaviour("notExisting");
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
      });

      it("stores current entities to session", async function(done) {
        let storedEntities = await this.currentSession.get("entities:currentPrompt:previousEntities");
        expect(JSON.parse(storedEntities).myEntity).toEqual("myValue");
        done();
      });
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
  });

  describe("answerPromptIntent", function() {
    answerPromptBehaviour("answerPrompt");
  });

  function answerPromptBehaviour(intentName: unifierInterfaces.intent) {
    describe("with the prompted entity given", function() {
      beforeEach(async function(done) {
        this.responseHandler = await this.callIntent(intentName, false, true, "PromptState", {"myEntityType": "Münster"});
        await this.currentSession.set("entities:currentPrompt:previousEntities", JSON.stringify(defaultEntities));
        this.entityDictionary = this.container.inversifyInstance.get("core:unifier:current-entity-dictionary");
        await this.specHelper.runMachine("PromptState");
        done()
      });

      it("puts needed entity in entity dictionary", function() {
        expect(this.entityDictionary.get("city")).toEqual("Münster");
      });
    
      it("puts saved entities in entity dictionary", function() {
        expect(this.entityDictionary.get("myEntity")).toEqual("myValue");
        expect(this.entityDictionary.get("myEntity2")).toEqual("myValue2");
      });
    });

    describe("with the prompted entity not given", function() {
      beforeEach(async function(done) {
        this.responseHandler = await this.callIntent(intentName);
        done();
      });

      it("returns unhandledIntent result", function() {
        expect(this.responseHandler.voiceMessage).toEqual("Prompt for city");
        expect(this.responseHandler.endSession).toBeFalsy();
      });
    });
  }
});