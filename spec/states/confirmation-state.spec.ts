import { GoogleSpecificHandable, GoogleSpecificTypes } from "assistant-google";
import { CurrentSessionFactory, EntityDictionary, GenericIntent, injectionNames, intent as Intent, Session, Transitionable } from "assistant-source";
import { HookContext, sessionKeys, ValidationStrategy } from "../../src/assistant-validations";
import { ThisContext } from "../this-context";

interface CurrentThisContext extends ThisContext {
  currentSession: Session;
  responseHandler: GoogleSpecificHandable<GoogleSpecificTypes>;
  stateMachine: Transitionable;
  responseHandlerResults: Partial<GoogleSpecificTypes>;
  setHookContext(): Promise<void>;
  callIntent(
    intent: Intent,
    callMachine?: boolean,
    setContext?: boolean,
    state?: string,
    getResults?: boolean,
    entities?: any
  ): Promise<GoogleSpecificHandable<GoogleSpecificTypes>>;
}

describe("ConfirmationState", function() {
  const hookContext: HookContext<ValidationStrategy.Confirmation> = {
    intent: "testIntent",
    state: "MainState",
    validation: {
      type: "confirmation",
    },
    redirectArguments: ["a1", "b2"],
  };

  beforeEach(async function(this: CurrentThisContext) {
    this.prepareWithStates();

    this.callIntent = async (intent, callMachine = true, setContext = true, state = "ConfirmationState", getResults: boolean = true) => {
      const responseHandler = this.specHelper.prepareIntentCall(this.platforms.google, intent, {}, { tellInvokeMessage: false });

      this.currentSession = this.inversify.get<CurrentSessionFactory>(injectionNames.current.sessionFactory)();

      if (setContext) {
        await this.setHookContext();
      }

      if (callMachine) {
        await this.specHelper.runMachine(state);
      }

      if (getResults) {
        this.responseHandlerResults = this.specHelper.getResponseResults();
      }

      return responseHandler;
    };

    this.setHookContext = () => {
      const session = this.inversify.get<CurrentSessionFactory>(injectionNames.current.sessionFactory)();
      return session.set(sessionKeys.confirmation.context, JSON.stringify(hookContext));
    };
  });

  describe("helpGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Help);
    });

    it("returns given help text", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual("Help for MainState and testIntent");
    });
  });

  describe("unhandledGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent("unhandled");
    });

    it("returns given help text", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual("Help for MainState and testIntent");
    });
  });

  describe("cancelGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Cancel);
    });

    it("returns general cancel text", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual("See you!");
      expect(this.responseHandlerResults.shouldSessionEnd).toBeTruthy();
    });
  });

  describe("invokeGenericIntent", function() {
    describe("with default values", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.responseHandler = await this.callIntent(GenericIntent.Invoke);
      });

      it("returns specific invoke message", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.voiceMessage!.text).toEqual("invokeGenericIntent for MainState testIntent");
      });
    });

    describe("without hook context", function() {
      it("throws an exception", async function(this: CurrentThisContext) {
        try {
          await this.callIntent(GenericIntent.Invoke, true, false, "ConfirmationState");
          fail("run machine has to throw an error");
        } catch (e) {
          expect(false).toBeFalsy();
        }
      });
    });
  });

  describe("yesGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Yes, false, true, "ConfirmationState", false);

      this.stateMachine = this.inversify.get(injectionNames.current.stateMachine);

      spyOn(this.stateMachine, "handleIntent").and.callThrough();

      await this.specHelper.runMachine("ConfirmationState");
    });

    it("transitions to given state and intent with additional 'true' information", async function(this: CurrentThisContext) {
      expect(this.stateMachine.handleIntent).toHaveBeenCalledWith("test", ...hookContext.redirectArguments, true);
    });
  });

  describe("noGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.No, false, true, "ConfirmationState", false);

      this.stateMachine = this.inversify.get(injectionNames.current.stateMachine);

      spyOn(this.stateMachine, "handleIntent").and.callThrough();

      await this.specHelper.runMachine("ConfirmationState");
    });

    it("transitions to given state and intent with additional 'false' information", async function(this: CurrentThisContext) {
      expect(this.stateMachine.handleIntent).toHaveBeenCalledWith("test", ...hookContext.redirectArguments, false);
    });
  });
});
