import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

export type ErrorWithMessage = {
  message: string;
  response?: {
    data?: {
      message: string;
    };
  };
};

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown) {
  const Error = toErrorWithMessage(error);

  return (
    (Error.response && Error.response.data && Error.response.data.message) ||
    Error.message ||
    Error.toString()
  );
}

export function HandleError(error: unknown) {
  const message = getErrorMessage(error);

  const E: any = error as Record<string, unknown>;
  const code =
    E?.response?.status || E?.code || E?.statusCode || E?.httpCode || 500;

  return {
    success: false,
    problem: message,
    code,
  };
}

export const HandleCatchException = (error: unknown) => {
  const { problem, code } = HandleError(error);

  if (problem.includes('duplicate key error collection')) {
    throw new ConflictException(problem);
  }

  if (code === 400) throw new BadRequestException(problem);

  if (code === 401) throw new UnauthorizedException(problem);

  if (code === 403) throw new ForbiddenException(problem);

  if (code === 404) throw new NotFoundException(problem);

  if (code === 409) throw new ConflictException(problem);

  if (code === 422) throw new UnprocessableEntityException(problem);

  if (code === 500) throw new InternalServerErrorException(problem);

  throw new InternalServerErrorException(problem);
};
