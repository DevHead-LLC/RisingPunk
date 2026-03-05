import { AppState, AppStateStatus } from 'react-native';
import { API_URL } from '../config';

/** Wait this long after first "server down" recognition before rechecking; only then show modal if still down. */
const SERVER_DOWN_RECHECK_AFTER_MS = 30000;
const SERVER_DOWN_HEALTH_FETCH_TIMEOUT_MS = 5000;
/** After app returns from background, ignore "server down" errors for this long (transient resume failures). */
const RESUME_GRACE_PERIOD_MS = 15000;

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private isHandlingError = false;
  private dispatchCallback: ((action: any) => void) | null = null;
  private getStateCallback: (() => any) | null = null;
  private serverDownRetryWindowStarted = false;
  private serverDownRetryTimeouts: ReturnType<typeof setTimeout>[] = [];
  /** In-flight health check: abort and clear when server is marked reachable so we don't show modal after a success. */
  private healthCheckAbortController: AbortController | null = null;
  private healthCheckTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Set true when we abort the health check from markServerReachable; catch uses this to skip showModalAndCleanup. 5s timeout abort leaves it false. */
  private healthCheckAbortedByReachable = false;
  /** When app last transitioned to active from background/inactive; used to avoid treating resume-time network glitches as server down. */
  private lastBecameActiveAt = 0;
  private appStateSubscription: { remove: () => void } | null = null;
  private currentAppState: AppStateStatus = 'active';

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
    this.ensureAppStateSubscription();
  }

  /** Subscribe once to AppState so we can ignore "server down" errors in the brief period after app resumes from background. */
  private ensureAppStateSubscription(): void {
    if (this.appStateSubscription) return;
    this.currentAppState = AppState.currentState;
    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackgroundOrInactive = this.currentAppState.match(/inactive|background/);
      this.currentAppState = nextState;
      if (wasBackgroundOrInactive && nextState === 'active') {
        this.lastBecameActiveAt = Date.now();
      }
    });
  }

  // Backward compatibility method
  initialize(dispatch: (action: any) => void, getState: () => any): void {
    this.updateCallbacks(dispatch, getState);
  }

  /** Call when any API request succeeds. Clears any pending "server down" 30s recheck so we only show the modal if the server stays down for 30s. */
  markServerReachable(): void {
    this.clearServerDownRetryTimeouts();
    this.serverDownRetryWindowStarted = false;
  }

  private clearServerDownRetryTimeouts(): void {
    if (this.healthCheckAbortController) {
      this.healthCheckAbortedByReachable = true;
      this.healthCheckAbortController.abort();
      this.healthCheckAbortController = null;
    }
    if (this.healthCheckTimeoutId) {
      clearTimeout(this.healthCheckTimeoutId);
      this.healthCheckTimeoutId = null;
    }
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
      this.clearServerDownRetryTimeouts();
      this.serverDownRetryWindowStarted = false;
      this.isHandlingError = false;
      return;
    }

    console.error('🔴 GLOBAL ERROR HANDLER: Database fetch error detected:', error);

    const errorStatus = error?.status ?? error?.statusCode;

    if (errorStatus === 401) {
      this.dispatchCallback({ type: 'ui/setGlobalErrorVariant', payload: 'generic' });
      this.dispatchCallback({ type: 'ui/setGlobalErrorModal', payload: true });
      this.isHandlingError = false;
      return;
    }

    if (this.isServerDownError(error, errorStatus)) {
      const now = Date.now();
      const withinResumeGracePeriod = this.lastBecameActiveAt > 0 && now - this.lastBecameActiveAt < RESUME_GRACE_PERIOD_MS;
      if (withinResumeGracePeriod) {
        // App just returned from background; transient network failures are common — don't treat as server down.
        this.isHandlingError = false;
        return;
      }
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
      this.dispatchCallback({ type: 'ui/setGlobalErrorVariant', payload: 'server_down' });
      this.dispatchCallback({ type: 'ui/setGlobalErrorModal', payload: true });
    };

    const recheckAfter30s = (): void => {
      if (!this.getStateCallback()?.auth?.token) {
        this.clearServerDownRetryTimeouts();
        this.serverDownRetryWindowStarted = false;
        return;
      }
      this.healthCheckAbortedByReachable = false;
      const controller = new AbortController();
      this.healthCheckAbortController = controller;
      this.healthCheckTimeoutId = setTimeout(() => controller.abort(), SERVER_DOWN_HEALTH_FETCH_TIMEOUT_MS);
      fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })
        .then((res) => {
          if (this.healthCheckTimeoutId) {
            clearTimeout(this.healthCheckTimeoutId);
            this.healthCheckTimeoutId = null;
          }
          this.healthCheckAbortController = null;
          if (res.ok) this.markServerReachable();
          else showModalAndCleanup();
        })
        .catch((err) => {
          if (this.healthCheckTimeoutId) {
            clearTimeout(this.healthCheckTimeoutId);
            this.healthCheckTimeoutId = null;
          }
          this.healthCheckAbortController = null;
          if (err?.name === 'AbortError') {
            if (this.healthCheckAbortedByReachable) {
              this.healthCheckAbortedByReachable = false;
              return; // Cancelled by markServerReachable; do not show modal
            }
            // Abort from 5s timeout = server hung; show modal and reset window
            showModalAndCleanup();
            return;
          }
          this.healthCheckAbortedByReachable = false;
          showModalAndCleanup();
        });
    };

    const timeoutId = setTimeout(() => {
      recheckAfter30s();
    }, SERVER_DOWN_RECHECK_AFTER_MS);
    this.serverDownRetryTimeouts.push(timeoutId);
  }

  /** True when the server is down, unreachable, timed out, or returned a server error (500–504, FETCH_ERROR, TIMEOUT_ERROR, or connection message). */
  private isServerDownError(error: any, status?: number): boolean {
    if (!error) return false;
    const s = status ?? error?.status ?? error?.statusCode;
    if (typeof s === 'number' && s >= 500 && s <= 504) return true;
    if (error?.status === 'FETCH_ERROR' || error?.error === 'FETCH_ERROR') return true;
    if (error?.status === 'TIMEOUT_ERROR' || error?.error === 'TIMEOUT_ERROR') return true;
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

  reset(): void {
    this.isHandlingError = false;
  }
}

// Export the class and a function to get the instance
export const getGlobalErrorHandler = (dispatch?: (action: any) => void, getState?: () => any) => 
  GlobalErrorHandler.getInstance(dispatch, getState);

// Backward compatibility export
export const globalErrorHandler = GlobalErrorHandler.getInstance();
