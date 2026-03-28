import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { SseEvent } from '../domain/models';

@Injectable()
export class EventsService {
  private readonly streams = new Map<string, Subject<MessageEvent>>();

  stream(familyId: string): Observable<MessageEvent> {
    return this.getStream(familyId).asObservable();
  }

  emit(event: SseEvent<unknown>): void {
    this.getStream(event.familyId).next({
      type: event.type,
      data: event,
    });
  }

  private getStream(familyId: string): Subject<MessageEvent> {
    if (!this.streams.has(familyId)) {
      this.streams.set(familyId, new Subject<MessageEvent>());
    }

    return this.streams.get(familyId)!;
  }
}
