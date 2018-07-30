// tslint:disable-next-line:no-implicit-dependencies
import { AlexaSpecHelper } from "assistant-alexa";
import { AssistantJSSetup, SpecHelper } from "assistant-source";
import { Container } from "inversify-components";

export interface ThisContext {
  assistantJs: AssistantJSSetup;
  specHelper: SpecHelper;
  alexaSpecHelper: AlexaSpecHelper;
  container: Container;
  prepareWithStates(): void;
}
