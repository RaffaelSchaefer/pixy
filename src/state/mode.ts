export interface PixyModeState {
  unhinged: boolean;
}

let modeState: PixyModeState = {
  unhinged: false,
};

export function isUnhingedMode(): boolean {
  return modeState.unhinged;
}

export function setUnhingedMode(enabled: boolean): void {
  modeState = {
    ...modeState,
    unhinged: enabled,
  };
}

export function getModeState(): PixyModeState {
  return { ...modeState };
}
