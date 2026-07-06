import { WebPlugin } from "@capacitor/core";
import type {
  JetlagLiveActivityPlugin,
  OngoingNotificationInput,
  QuestionActivityInput,
  QuestionActivityUpdate,
  SessionTimerActivityInput,
  SessionTimerActivityUpdate,
} from "./definitions";

export class JetlagLiveActivityWeb
  extends WebPlugin
  implements JetlagLiveActivityPlugin
{
  async startQuestionActivity(input: QuestionActivityInput): Promise<void> {
    void input;
  }

  async updateQuestionActivity(input: QuestionActivityUpdate): Promise<void> {
    void input;
  }

  async endQuestionActivity(): Promise<void> {
    return undefined;
  }

  async startSessionTimerActivity(
    input: SessionTimerActivityInput,
  ): Promise<void> {
    void input;
  }

  async updateSessionTimerActivity(
    input: SessionTimerActivityUpdate,
  ): Promise<void> {
    void input;
  }

  async endSessionTimerActivity(): Promise<void> {
    return undefined;
  }

  async showOngoingNotification(input: OngoingNotificationInput): Promise<void> {
    void input;
  }

  async dismissOngoingNotification(input: { id: number }): Promise<void> {
    void input;
  }
}
