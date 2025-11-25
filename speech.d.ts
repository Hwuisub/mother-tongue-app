declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }

  interface SpeechRecognitionEvent {
    readonly results: {
      [index: number]: {
        [index: number]: {
          transcript: string;
        };
      };
    };
  }
}

export {};
