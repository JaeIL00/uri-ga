import {
  Controller,
  ForbiddenException,
  Param,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SessionGuard } from '../common/session/session.guard';
import type { RequestWithSession } from '../common/session/request-with-session';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(SessionGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Sse('family/:familyId')
  familyEvents(
    @Req() request: RequestWithSession,
    @Param('familyId') familyId: string,
  ): Observable<MessageEvent> {
    if (request.sessionContext.familyId !== familyId) {
      throw new ForbiddenException(
        'You can only subscribe to your family channel.',
      );
    }

    return this.eventsService.stream(familyId);
  }
}
