import { API_URL } from '../config';

/** Wait this long after first "server down" recognition before rechecking; only then show modal if still down. */
const SERVER_DOWN_RECHECK_AFTER_MS = 30000;
const SERVER_DOWN_HEALTH_FETCH_TIMEOUT_MS = 5000;

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private isHandlingError = false;
  private dispatchCallback: ((action: any) => void) | null = null;
  private getStateCallback: (() => any) | null = null;
  private hasHadSuccessfulRequestSinceAuth = false;
  private serverDownRetryWindowStarted = false;
  private serverDownRetryTimeouts: ReturnType<typeof setTimeout>[] = [];

  private constructor(dispatch?: (action: any) => void, getState?: () => any) {
    this.dispatchCallback = dispatch || null;
    this.getStateCallback = getState || null;
  }

  static getInstance(dispatch?: (action: any) => void, getState?: () => any): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler(dispatch, getState);
    }
    return GlobalErrorHandler.instance;
  }

  // Update callbacks if needed (for cases where store isn't ready during instantiation)
  updateCallbacks(dispatch: (action: any) => void, getState: () => any): void {
    this.dispatchCallback = dispatch;
    this.getStateCallback = getState;
  }

  // Backward compatibility method
  initialize(dispatch: (action: any) => void, getState: () => any): void {
    this.updateCallbacks(dispatch, getState);
  }

  /** Call when any API request succeeds. Clears any pending "server down" 30s recheck so we only show the modal if the server stays down for 30s. */
  markServerReachable(): void {
    this.hasHadSuccessfulRequestSinceAuth = true;
    this.clearServerDownRetryTimeouts();
    this.serverDownRetryWindowStarted = false;
  }

  private clearServerDownRetryTimeouts(): void {
    this.serverDownRetryTimeouts.forEach((id) => clearTimeout(id));
    this.serverDownRetryTimeouts = [];
  }

  handleDatabaseError(error: any): void {
    if (this.isHandlingError) {
      return;
    }

    this.isHandlingError = true;

    // Check if we have the callbacks initialized
    if (!this.dispatchCallback || !this.getStateCallback) {
      console.warn('🔴 GLOBAL ERROR HANDLER: Not initialized with Redux callbacks');
      this.isHandlingError = false;
      return;
    }

    const state = this.getStateCallback();
    if (!state.auth?.token) {
      this.hasHadSuccessfulRequestSinceAuth = false;
      this.clearServerDownRetryTimeouts();
      this.serverDownRetryWindowStarted = false;
      this.isHandlingError = false;
      return;
    }

    console.error('🔴 GLOBAL ERROR HANDLER: Database fetch error detected:', error);

    const errorStatus = error?.status || error?.statusCode;

    if (this.isServerDownError(error, errorStatus)) {
      this.handleServerDownInInitialPhase();
    }
    this.isHandlingError = false;
  }

  /** On server-down error: start 30s recheck window if not already started. After 30s we recheck once; if still down, show modal. Any success clears the window. */
  private handleServerDownInInitialPhase(): void {
    if (this.serverDownRetryWindowStarted) return;
    this.serverDownRetryWindowStarted = true;

    const showModalAndCleanup = (): void => {
      this.clearServerDownRetryTimeouts();
      this.serverDownRetryWindowStarted = false;
      if (!this.dispatchCallback || !this.getStateCallback()?.auth?.token) return;
      this.dispatchCallback({ type: 'ui/setGlobalErrorModal', payload: true });
      this.dispatchCallback({ type: 'ui/setGlobalErrorVariant', payload: 'server_down' });
    };

    const recheckAfter30s = (): void => {
      if (!this.getStateCallback()?.auth?.token) return;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SERVER_DOWN_HEALTH_FETCH_TIMEOUT_MS);
      fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })
        .then((res) => {
          clearTimeout(timeoutId);
          if (res.ok) this.markServerReachable();
          else showModalAndCleanup();
        })
        .catch(() => {
          clearTimeout(timeoutId);
          showModalAndCleanup();
        });
    };

    const timeoutId = setTimeout(() => {
      recheckAfter30s();
    }, SERVER_DOWN_RECHECK_AFTER_MS);
    this.serverDownRetryTimeouts.push(timeoutId);
  }

  /** True only when the server is down or unreachable (502, 503, 504, or connection/fetch failure to API). */
  private isServerDownError(error: any, status?: number): boolean {
    if (!error) return false;
    const s = status ?? error?.status ?? error?.statusCode;
    if (s === 502 || s === 503 || s === 504) return true;
    if (error?.status === 'FETCH_ERROR' || error?.error === 'FETCH_ERROR') return true;
    const msg = (error?.message ?? error?.error ?? '').toString().toLowerCase();
    if (
      msg.includes('failed to fetch') ||
      msg.includes('network request failed') ||
      msg.includes('connection refused') ||
      msg.includes('could not connect') ||
      msg.includes('server is not responding')
    ) {
      return true;
    }
    return false;
  }

  private isDatabaseError(error: any, status?: number): boolean {
    if (!error) return false;

    if (status === 401) {
      // Don't treat ACCOUNT_SWITCHED as a database error - let it be handled by the account switched flow
      if (error?.data?.error === 'ACCOUNT_SWITCHED') {
        return false;
      }
      return true;
    }

    if (status && status >= 500) {
      return true;
    }

    if (error.status === 'TIMEOUT_ERROR' || status === 'TIMEOUT_ERROR') {
      return true;
    }

    if (error.message && typeof error.message === 'string') {
      const message = error.message.toLowerCase();
      return (
        message.includes('database') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('abort')
      );
    }

    if (error.error && typeof error.error === 'string') {
      const errorText = error.error.toLowerCase();
      return (
        errorText.includes('database') ||
        errorText.includes('connection') ||
        errorText.includes('timeout') ||
        errorText.includes('network') ||
        errorText.includes('fetch') ||
        errorText.includes('abort')
      );
    }

    return false;
  }

  reset(): void {
    this.isHandlingError = false;
  }
}

// Export the class and a function to get the instance
export const getGlobalErrorHandler = (dispatch?: (action: any) => void, getState?: () => any) => 
  GlobalErrorHandler.getInstance(dispatch, getState);

// Backward compatibility export
export const globalErrorHandler = GlobalErrorHandler.getInstance();
