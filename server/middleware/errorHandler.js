export function errorHandler(
  error,
  req,
  res,
  next
) {
  console.error(
    'Unhandled server error:',
    {
      name: error?.name,
      message: error?.message,
      status: error?.status,
    }
  );

  if (res.headersSent) {
    return next(error);
  }

  const status =
    Number.isInteger(
      error?.status
    ) &&
    error.status >= 400 &&
    error.status < 600
      ? error.status
      : 500;

  let message =
    'Internal server error.';

  if (
    status >= 400 &&
    status < 500 &&
    error?.message
  ) {
    message =
      error.message;
  }

  res.status(status).json({
    error: message,
  });
}