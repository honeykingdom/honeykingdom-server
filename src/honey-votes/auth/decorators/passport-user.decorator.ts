import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** Returns req.user */
export const PassportUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    return request.user;
  },
);
