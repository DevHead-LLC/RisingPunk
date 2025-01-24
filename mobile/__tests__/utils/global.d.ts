declare global {
  var ErrorUtils: {
    setGlobalHandler: (callback: (error: Error) => boolean) => void;
  };
}

export {}; 