import { Elysia } from "elysia";

// Klasy błędów
export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Validation failed") {
    super(400, message);
  }
}

// Plugin
export const errorPlugin = new Elysia()
  .error({
    API_ERROR: ApiError,
    NOT_FOUND: NotFoundError,
    VALIDATION: ValidationError,
  })
  .onError(({ code, error, set }) => {
    console.log("piwio");
    // 1. Zawsze loguj błąd w konsoli (to pomoże Ci debugować)
    console.error(`[${code}]:`, error);

    // 2. Bezpieczne wyciąganie statusu
    let httpStatus: number = 500;

    if (error instanceof ApiError) {
      httpStatus = error.statusCode;
    } else if (code === "NOT_FOUND") {
      httpStatus = 404;
    } else if (code === "VALIDATION") {
      httpStatus = 400;
    }

    set.status = httpStatus;

    // 3. Bezpieczne wyciąganie wiadomości (Rozwiązanie Twojego błędu TS)
    // Sprawdzamy czy error to obiekt i czy ma message, w przeciwnym razie fallback
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unknown error occurred";

    return {
      success: false,
      error: errorMessage,
    };
  });
