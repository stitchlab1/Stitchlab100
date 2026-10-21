export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface VocabularyCard {
  id: string;
    englishWord: string;
      arabicTranslation: string;
        imageUrl?: string;
          category?: string;
            level?: CEFRLevel;
              exampleSentence?: string;
              }

              export type Flashcard = VocabularyCard;

              export interface ChatMessage {
                id?: string;
                  sender: 'user' | 'bot';
                    text: string;
                      timestamp?: number;
                      }

                      export interface Persona {
                        id: string;
                          name: string;
                            description: string;
                              avatar?: string;
                              }

                              export const PRESET_PERSONAS: Persona[] = [];
                              export const DAILY_QUOTES: string[] = [];
                              export const PRESET_FLASHCARDS: Flashcard[] = [];

                              export const playAudioFeedback = () => {};
                              export const playButtonClickSound = () => {};

                              export type LearningModule = any;
                              export type DeviceRecord = any;
                              