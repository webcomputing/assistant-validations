import { GoogleSpecificHandable, GoogleSpecificTypes } from "assistant-google";
import { CurrentSessionFactory, GenericIntent, injectionNames, intent as Intent, Session, Transitionable, TranslateValuesFor } from "assistant-source";
import { ConfirmationResult, confirmationResultIdentifier, HookContext, sessionKeys, ValidationStrategy } from "../../src/assistant-validations";
import { ThisContext } from "../this-context";

interface CurrentThisContext extends ThisContext {
  currentSession: Session;
  responseHandler: GoogleSpecificHandable<GoogleSpecificTypes>;
  stateMachine: Transitionable;
  responseHandlerResults: Partial<GoogleSpecificTypes>;
  hookContext: HookContext<ValidationStrategy.Confirmation>;
  translateValuesFor: TranslateValuesFor;

  /** Store the current hook context as a session variable */
  setHookContext(): Promise<void>;

  /**
   * Call a given intent with further options
   * @param intent The intent being called
   * @param callMachine If set to true, the state machine is run as well
   * @param setContext If set to true, the hook context is stored as a session variable
   * @param state The state of the state machine
   * @param getResults If set to true, the responseResults are available under this.responseHandlerResults
   * @param tellInvokeMessage The value of the tellInvokeMessage parameter of the invokeGenericIntent method
   */
  callIntent(
    intent: Intent,
    callMachine?: boolean,
    setContext?: boolean,
    state?: string,
    getResults?: boolean,
    tellInvokeMessage?: boolean
  ): Promise<GoogleSpecificHandable<GoogleSpecificTypes>>;
}

describe("ConfirmationState", function() {
  beforeEach(async function(this: CurrentThisContext) {
    this.hookContext = {
      intent: "testIntent",
      state: "MainState",
      validation: {
        type: "confirmation",
      },
      redirectArguments: ["a1", "b2"],
    };

    this.prepareWithStates();

    this.callIntent = async (
      intent,
      callMachine = true,
      setContext = true,
      state = "ConfirmationState",
      getResults: boolean = true,
      tellInvokeMessage: boolean = true
    ) => {
      const responseHandler = this.platforms.google.pretendIntentCalled(intent);

      this.currentSession = this.inversify.get<CurrentSessionFactory>(injectionNames.current.sessionFactory)();

      // Spy on handleIntent to get test transitions to other intents
      this.stateMachine = this.inversify.get(injectionNames.current.stateMachine);
      spyOn(this.stateMachine, "handleIntent").and.callThrough();

      if (setContext) {
        await this.setHookContext();
      }

      if (callMachine) {
        await this.specHelper.runMachine(state, tellInvokeMessage);
      }

      if (getResults) {
        this.responseHandlerResults = this.specHelper.getResponseResults();
      }

      // Set translateValuesFor helper
      this.translateValuesFor = this.translateValuesForGetter();

      return responseHandler;
    };

    this.setHookContext = () => {
      const session = this.inversify.get<CurrentSessionFactory>(injectionNames.current.sessionFactory)();
      return session.set(sessionKeys.context, JSON.stringify(this.hookContext));
    };
  });

  describe("helpGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Help);
    });

    it("returns given help text", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual(
        (await this.translateValuesFor("confirmationState.helpGenericIntent.MainState.testIntent"))[0]
      );
    });
  });

  describe("unhandledGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent("unhandled");
    });

    it("returns given unhandled text", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual(
        (await this.translateValuesFor("confirmationState.unhandledGenericIntent.MainState.testIntent"))[0]
      );
    });
  });

  describe("cancelGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Cancel);
    });

    it("returns general cancel text", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual((await this.translateValuesFor("root.cancelGenericIntent"))[0]);
      expect(this.responseHandlerResults.shouldSessionEnd).toBeTruthy();
    });
  });

  describe("invokeGenericIntent", function() {
    describe("with hook context", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.responseHandler = await this.callIntent(GenericIntent.Invoke);
      });

      it("returns specific invoke message", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.voiceMessage!.text).toEqual(
          (await this.translateValuesFor("confirmationState.invokeGenericIntent.MainState.testIntent"))[0]
        );
      });

      it("adds suggestion chips", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.suggestionChips).toEqual(["Yes", "No"]);
      });
    });

    describe("without hook context", function() {
      it("throws an exception", async function(this: CurrentThisContext) {
        this.callIntent(GenericIntent.Invoke, true, false, "ConfirmationState").catch(e => {
          expect(e).toEqual(new Error("HookContext must not be undefined!"));
        });
      });
    });

    describe("with tellInvokeMessage as 'false'", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.responseHandler = await this.callIntent(GenericIntent.Invoke, true, true, "ConfirmationState", true, false);
      });

      it("returns no invoke message", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.voiceMessage).toBeUndefined();
      });
    });

    describe("with different hook context and fallback values for prompt messages", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.hookContext.state = "MainState2";
        this.hookContext.intent = "testIntent2";
        this.responseHandler = await this.callIntent(GenericIntent.Invoke);
      });

      it("returns fallback values", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.voiceMessage!.text).toEqual((await this.translateValuesFor("confirmationState.MainState2.testIntent2"))[0]);
      });
    });

    describe("without suggestionChips", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.hookContext.intent = "needsConfirmationCustomStateIntent";
        this.responseHandler = await this.callIntent(GenericIntent.Invoke, true, true, "MyConfirmationState");
      });

      it("adds no suggestion chips", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.suggestionChips).toBeUndefined();
      });
    });
  });

  describe("yesGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Yes);
    });

    it("transitions to given state and intent with additional 'true' information", async function(this: CurrentThisContext) {
      const expectedConfirmationResult: ConfirmationResult = {
        returnIdentifier: confirmationResultIdentifier,
        confirmed: true,
      };
      expect(this.stateMachine.handleIntent).toHaveBeenCalledWith("test", ...this.hookContext.redirectArguments, expectedConfirmationResult);
    });
  });

  describe("noGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.No);
    });

    it("transitions to given state and intent with additional 'false' information", async function(this: CurrentThisContext) {
      const expectedConfirmationResult: ConfirmationResult = {
        returnIdentifier: confirmationResultIdentifier,
        confirmed: false,
      };
      expect(this.stateMachine.handleIntent).toHaveBeenCalledWith("test", ...this.hookContext.redirectArguments, expectedConfirmationResult);
    });
  });
});
