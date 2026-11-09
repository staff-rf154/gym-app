import { Injectable } from '@nestjs/common';
import { Message } from '@prisma/client';
import { Subject } from 'rxjs';

@Injectable()
export class ChatEvents {
  private readonly subject = new Subject<Message>();

  readonly message$ = this.subject.asObservable();

  emitMessage(message: Message): void {
    this.subject.next(message);
  }
}
