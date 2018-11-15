import { GoogleSpecHelper } from "assistant-google";
import { AssistantJSSetup, SpecHelper } from "assistant-source";
import { Container } from "inversify-components";

export interface ThisContext {
  assistantJs: AssistantJSSetup;
  specHelper: SpecHelper;
  googleSpecHelper: GoogleSpecHelper;
  container: Container;
  prepareWithStates(): void;
}
