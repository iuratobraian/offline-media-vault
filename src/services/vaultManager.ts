/**
 * Private Vault Manager for Offline Media Vault.
 * Uses Web Crypto API (SHA-256) for passcode verification and session unlocking.
 */

const STORAGE_KEY_PIN_HASH = 'omv_vault_pin_hash';

class VaultManager {
  private unlocked: boolean = false;

  public hasVaultPin(): boolean {
    return !!localStorage.getItem(STORAGE_KEY_PIN_HASH);
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  public lockVault(): void {
    this.unlocked = false;
  }

  public async setVaultPin(pin: string): Promise<void> {
    if (!pin || pin.length < 4) {
      throw new Error('El PIN debe tener al menos 4 dígitos.');
    }
    const hash = await this.hashPin(pin);
    localStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
    this.unlocked = true;
  }

  public async unlockVault(pin: string): Promise<boolean> {
    const savedHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);
    if (!savedHash) return false;

    const inputHash = await this.hashPin(pin);
    if (inputHash === savedHash) {
      this.unlocked = true;
      return true;
    }
    return false;
  }

  public async resetVaultPin(oldPin: string, newPin: string): Promise<boolean> {
    const isValid = await this.unlockVault(oldPin);
    if (!isValid) return false;
    await this.setVaultPin(newPin);
    return true;
  }

  private async hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`omv_salt_${pin}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

export const vaultManager = new VaultManager();
