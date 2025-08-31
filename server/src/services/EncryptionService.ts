import CryptoJS from 'crypto-js';

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-256-CBC';
  private static readonly ENCODING = 'base64';

  private static getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required for email encryption');
    }
    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
    return key;
  }

  static encryptEmail(email: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = CryptoJS.lib.WordArray.random(16);
      
      const encrypted = CryptoJS.AES.encrypt(email, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const result = iv.toString() + encrypted.toString();
      return result;
    } catch (error) {
      console.error('Email encryption failed:', error);
      throw new Error('Failed to encrypt email');
    }
  }

  static decryptEmail(encryptedEmail: string): string {
    try {
      const key = this.getEncryptionKey();
      
      const iv = CryptoJS.enc.Hex.parse(encryptedEmail.substr(0, 32));
      const ciphertext = encryptedEmail.substr(32);
      
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Email decryption failed:', error);
      throw new Error('Failed to decrypt email');
    }
  }

  static isEncrypted(value: string): boolean {
    try {
      if (!value || value.length < 32) return false;
      this.decryptEmail(value);
      return true;
    } catch {
      return false;
    }
  }
}
