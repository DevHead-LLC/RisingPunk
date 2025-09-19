export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private isHandlingError = false;
  private dispatchCallback: ((action: any) => void) | null = null;
  private getStateCallback: (() => any) | null = null;

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

  handleDatabaseError(error: any): void {
    if (this.isHandlingError) {
      return;
    }

    this.isHandlingError = true;

    console.error('🔴 GLOBAL ERROR HANDLER: Database fetch error detected:', error);

    // Check if we have the callbacks initialized
    if (!this.dispatchCallback || !this.getStateCallback) {
      console.warn('🔴 GLOBAL ERROR HANDLER: Not initialized with Redux callbacks');
      this.isHandlingError = false;
      return;
    }

    // Get current state to check if user is authenticated
    const state = this.getStateCallback();
    
    // Only show modal if user is authenticated (has token)
    if (!state.auth?.token) {
      console.log('🔴 GLOBAL ERROR HANDLER: User not authenticated, skipping modal');
      this.isHandlingError = false;
      return;
    }

    const errorStatus = error?.status || error?.statusCode;
    const isDatabaseError = this.isDatabaseError(error, errorStatus);

    if (isDatabaseError) {
      console.log('🔴 GLOBAL ERROR HANDLER: Database error confirmed, showing modal');
      
      this.dispatchCallback({ type: 'ui/setGlobalErrorModal', payload: true });
      this.isHandlingError = false;
    } else {
      this.isHandlingError = false;
    }
  }

  private isDatabaseError(error: any, status?: number): boolean {
    if (!error) return false;

    if (status === 401) {
      return true;
    }

    if (status && status >= 500) {
      return true;
    }

    if (error.message && typeof error.message === 'string') {
      const message = error.message.toLowerCase();
      return (
        message.includes('database') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('fetch')
      );
    }

    if (error.error && typeof error.error === 'string') {
      const errorText = error.error.toLowerCase();
      return (
        errorText.includes('database') ||
        errorText.includes('connection') ||
        errorText.includes('timeout') ||
        errorText.includes('network') ||
        errorText.includes('fetch')
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
