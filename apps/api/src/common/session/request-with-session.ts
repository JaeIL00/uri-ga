import { Request } from 'express';
import { SessionContext } from '../../domain/models';

export interface RequestWithSession extends Request {
  sessionContext: SessionContext;
}
