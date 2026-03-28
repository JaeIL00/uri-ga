import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  decodeSessionCookie,
  getSessionCookieName,
  parseCookies,
} from './session-cookie';
import { RequestWithSession } from './request-with-session';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const cookies = parseCookies(request.headers.cookie);
    const session = decodeSessionCookie(cookies[getSessionCookieName()]);

    if (!session) {
      throw new UnauthorizedException('A device session is required.');
    }

    request.sessionContext = session;
    return true;
  }
}
