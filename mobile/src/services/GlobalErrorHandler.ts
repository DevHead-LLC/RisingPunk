import { store } from '../store';
import { logoutUser } from '../store/slices/authSlice';
import { setGlobalErrorModal } from '../store/slices/uiSlice';

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private isHandlingError = false;

  private constructor() {}

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  handleDatabaseError(error: any): void {
    if (this.isHandlingError) {
      return;
    }

    this.isHandlingError = true;

    console.error('🔴 GLOBAL ERROR HANDLER: Database fetch error detected:', error);

    const state = store.getState();
    
    if (!state.auth.token) {
      this.isHandlingError = false;
      return;
    }

    const errorStatus = error?.status || error?.statusCode;
    const isDatabaseError = this.isDatabaseError(error, errorStatus);

    if (isDatabaseError) {
      console.log('🔴 GLOBAL ERROR HANDLER: Database error confirmed, showing modal');
      
      store.dispatch(setGlobalErrorModal(true));
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

    if (status >= 500) {
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

export const globalErrorHandler = GlobalErrorHandler.getInstance();
